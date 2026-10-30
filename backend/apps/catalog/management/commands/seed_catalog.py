from django.core.management.base import BaseCommand
from django.utils.text import slugify
from apps.catalog.models import Subject, Topic


SEED_DATA = {
    "Mathematics": {
        "icon": "calculator",
        "description": "Algebra, Calculus, Trigonometry, Statistics, Linear Algebra, and Discrete Mathematics.",
        "topics": [
            "Algebra & Polynomials", "Calculus (Differentiation)", "Calculus (Integration)",
            "Trigonometry", "Coordinate Geometry", "Linear Algebra & Matrices",
            "Probability & Statistics", "Number Theory", "Sequences & Series",
            "Differential Equations", "Complex Numbers", "Set Theory & Logic",
        ]
    },
    "Physics": {
        "icon": "atom",
        "description": "Mechanics, Thermodynamics, Electromagnetism, Optics, Quantum Physics, and Modern Physics.",
        "topics": [
            "Classical Mechanics", "Laws of Motion & Newton's Laws",
            "Work, Energy & Power", "Rotational Mechanics",
            "Thermodynamics", "Kinetic Theory of Gases",
            "Electrostatics", "Current Electricity & Circuits",
            "Electromagnetic Induction", "Optics (Ray & Wave)",
            "Modern Physics & Atomic Structure", "Waves & Sound",
            "Gravitation", "Fluid Mechanics",
        ]
    },
    "Chemistry": {
        "icon": "flask-conical",
        "description": "Physical, Organic, and Inorganic Chemistry for competitive exam preparation.",
        "topics": [
            "Atomic Structure & Quantum Chemistry", "Chemical Bonding & Molecular Structure",
            "Thermochemistry & Chemical Thermodynamics", "Chemical Equilibrium",
            "Electrochemistry", "Chemical Kinetics",
            "Organic Chemistry: Hydrocarbons", "Organic Chemistry: Functional Groups",
            "Organic Chemistry: Reaction Mechanisms", "Periodic Table & Element Properties",
            "Coordination Chemistry", "Solutions & Colligative Properties",
        ]
    },
    "Biology": {
        "icon": "microscope",
        "description": "Cell Biology, Genetics, Human Physiology, Ecology, and Evolution for NEET/medical entrance exams.",
        "topics": [
            "Cell Biology & Cell Division", "Genetics & Heredity",
            "Molecular Biology (DNA, RNA, Protein Synthesis)", "Human Physiology",
            "Plant Physiology", "Ecology & Environment",
            "Evolution & Origin of Life", "Biotechnology & its Applications",
            "Animal Kingdom Classification", "Plant Kingdom & Morphology",
        ]
    },
    "Computer Science": {
        "icon": "code",
        "description": "Data Structures, Algorithms, Operating Systems, DBMS, Computer Networks, and OOP.",
        "topics": [
            "Data Structures (Arrays, Stacks, Queues)", "Linked Lists & Trees",
            "Graphs & Graph Algorithms", "Sorting & Searching Algorithms",
            "Dynamic Programming", "Operating Systems Concepts",
            "Database Management Systems (DBMS)", "Computer Networks",
            "Object-Oriented Programming", "Theory of Computation",
        ]
    },
    "History": {
        "icon": "landmark",
        "description": "Ancient, Medieval, and Modern World & Indian History for UPSC, SSC, and competitive exams.",
        "topics": [
            "Ancient Indian History", "Medieval Indian History",
            "Modern Indian History & Freedom Struggle", "World War I & II",
            "French Revolution & Enlightenment", "Industrial Revolution",
            "Ancient Civilizations (Mesopotamia, Egypt, Indus Valley)",
            "Post-Independence India", "Cold War Era", "Renaissance & Reformation",
        ]
    },
    "Geography": {
        "icon": "globe",
        "description": "Physical, Human, and Economic Geography for UPSC and competitive examinations.",
        "topics": [
            "Physical Geography (Geomorphology)", "Climatology & Atmospheric Science",
            "Oceanography", "Indian Geography",
            "World Geography", "Economic Geography & Resources",
            "Human Geography & Population", "Mapping & Cartography",
        ]
    },
    "English": {
        "icon": "book-open",
        "description": "Grammar, Vocabulary, Reading Comprehension, and Verbal Ability for competitive exams.",
        "topics": [
            "Grammar (Tenses, Voices, Narration)", "Vocabulary & Synonyms/Antonyms",
            "Reading Comprehension", "Sentence Correction & Error Spotting",
            "Para Jumbles & Sentence Rearrangement", "Idioms & Phrases",
            "Fill in the Blanks & Cloze Tests", "Essay & Precis Writing",
        ]
    },
}


class Command(BaseCommand):
    help = 'Seeds the catalog with subjects and topics for academic mock tests'

    def handle(self, *args, **kwargs):
        created_subjects = 0
        created_topics = 0

        for subject_name, data in SEED_DATA.items():
            subject, s_created = Subject.objects.get_or_create(
                slug=slugify(subject_name),
                defaults={
                    'name': subject_name,
                    'icon': data['icon'],
                    'description': data['description'],
                    'is_active': True,
                }
            )
            if s_created:
                created_subjects += 1
                self.stdout.write(self.style.SUCCESS(f'  [+] Subject created: {subject_name}'))
            else:
                self.stdout.write(self.style.WARNING(f'  [-] Subject exists: {subject_name}'))

            for topic_name in data['topics']:
                topic, t_created = Topic.objects.get_or_create(
                    subject=subject,
                    slug=slugify(topic_name),
                    defaults={
                        'name': topic_name,
                        'description': f'Mock test questions on {topic_name} under {subject_name}.',
                    }
                )
                if t_created:
                    created_topics += 1

        self.stdout.write(self.style.SUCCESS(
            f'\nSeeding complete: {created_subjects} subjects, {created_topics} topics created.'
        ))
