from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.catalog.models import Subject, Topic
from apps.test_sessions.models import TestSession

User = get_user_model()

class PlatformCoreApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="student@example.com",
            password="StrongPassword123!",
            full_name="Alex Student"
        )
        self.subject = Subject.objects.create(
            name="History",
            slug="history",
            icon="landmark",
            description="Ancient and Modern History"
        )
        self.topic = Topic.objects.create(
            subject=self.subject,
            name="Stone Age",
            slug="stone-age"
        )

    def test_auth_login_and_jwt(self):
        # Test Login
        response = self.client.post(
            reverse('login'),
            {"email": "student@example.com", "password": "StrongPassword123!"},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], "student@example.com")

    def test_catalog_endpoints(self):
        response = self.client.get(reverse('subject_list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

        response = self.client.get(reverse('topic_list', kwargs={'subject_id': self.subject.id}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['name'], "Stone Age")

    def test_test_generation_and_hidden_answers(self):
        self.client.force_authenticate(user=self.user)

        # 1. Generate test
        gen_res = self.client.post(
            reverse('generate_test'),
            {"subject_id": self.subject.id, "topic": "Stone Age", "count": 5},
            format='json'
        )
        self.assertEqual(gen_res.status_code, status.HTTP_201_CREATED)
        session_id = gen_res.data["session_id"]

        # 2. Fetch active test (AC-4: correct answers & explanations MUST NOT be in response)
        detail_res = self.client.get(reverse('test_detail', kwargs={'session_id': session_id}))
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        questions = detail_res.data["questions"]
        self.assertEqual(len(questions), 5)
        for q in questions:
            self.assertNotIn("correct_index", q)
            self.assertNotIn("explanation", q)
            self.assertEqual(len(q["options"]), 4)

        # 3. Autosave answer
        save_res = self.client.patch(
            reverse('autosave_answers', kwargs={'session_id': session_id}),
            {"answers": [{"position": 1, "selected_index": 0, "is_flagged": False, "time_spent_sec": 12}]},
            format='json'
        )
        self.assertEqual(save_res.status_code, status.HTTP_200_OK)

        # 4. Submit test
        sub_res = self.client.post(
            reverse('submit_test', kwargs={'session_id': session_id}),
            {"answers": [{"position": 1, "selected_index": 0}]},
            format='json'
        )
        self.assertEqual(sub_res.status_code, status.HTTP_200_OK)
        self.assertEqual(sub_res.data["status"], "submitted")

        # 5. Result view now contains correct answers and explanations
        res_view = self.client.get(reverse('test_result', kwargs={'session_id': session_id}))
        self.assertEqual(res_view.status_code, status.HTTP_200_OK)
        for q in res_view.data["questions"]:
            self.assertIn("correct_index", q)
            self.assertIn("explanation", q)

    def test_idor_protection(self):
        # Another user cannot view or submit user's test
        other_user = User.objects.create_user(email="intruder@example.com", password="Password123!")
        self.client.force_authenticate(user=self.user)
        gen_res = self.client.post(
            reverse('generate_test'),
            {"subject_id": self.subject.id, "topic": "Stone Age", "count": 5},
            format='json'
        )
        session_id = gen_res.data["session_id"]

        # Intruder attempts access -> must be 404 (not 403, preventing enumeration)
        self.client.force_authenticate(user=other_user)
        intruder_res = self.client.get(reverse('test_detail', kwargs={'session_id': session_id}))
        self.assertEqual(intruder_res.status_code, status.HTTP_404_NOT_FOUND)
