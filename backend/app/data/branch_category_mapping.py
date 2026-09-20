import re

BRANCH_CATEGORIES = {
    "Computer Science & IT": [
        "Computer Engineering", "Computer Science and Engineering", "Information Technology",
        "Computer Technology", "Computer Science and Design", "Computer Science and Business Systems",
        "Computer Engineering (Software Engineering)"
    ],
    "Artificial Intelligence & Data": [
        "Artificial Intelligence and Data Science", "Artificial Intelligence (AI) and Data Science",
        "Computer Science and Engineering(Artificial Intelligence and Machine Learning)",
        "Computer Science and Engineering(Data Science)", "Artificial Intelligence and Machine Learning",
        "Computer Science and Engineering (Artificial Intelligence)", "Data Science",
        "Computer Science and Engineering (Internet of Things and Cyber Security Including Block Chain Technology)",
        "Computer Science and Engineering (Cyber Security)", "Internet of Things (IoT)",
        "Computer Science and Information Technology"
    ],
    "Electronics & Electrical": [
        "Electronics and Telecommunication Engg", "Electrical Engineering", "Electronics Engineering",
        "Electronics and Computer Engineering", "Electronics and Computer Science",
        "Electronics and Communication Engineering", "Electrical Engg[Electronics and Power]",
        "Instrumentation Engineering", "Instrumentation and Control Engineering",
        "Electrical and Electronics Engineering", "Electrical and Mechanical Engineering"
    ],
    "Mechanical & Automation": [
        "Mechanical Engineering", "Automation and Robotics", "Robotics and Automation",
        "Mechatronics Engineering", "Automobile Engineering", "Mechanical and Automation Engineering",
        "Production Engineering", "Manufacturing Science and Engineering"
    ],
    "Civil & Environmental": [
        "Civil Engineering", "Civil and Environmental Engineering", "Civil and Infrastructure Engineering",
        "Structural Engineering", "Environmental Engineering"
    ],
    "Chemical & Biotech": [
        "Chemical Engineering", "Bio Technology", "Food Technology", "Oil Technology",
        "Petro Chemical Engineering", "Pharmaceutical and Fine Chemical Technology",
        "Plastic Technology", "Surface Coating Technology", "Textile Engineering / Technology"
    ]
}

def categorize_branch(branch_name: str) -> str:
    name_lower = branch_name.lower()
    
    if any(k in name_lower for k in ["artificial intelligence", "data science", "machine learning", "cyber security", "internet of things"]):
        return "Artificial Intelligence & Data"
    if any(k in name_lower for k in ["computer", "information technology", "software"]):
        return "Computer Science & IT"
    if any(k in name_lower for k in ["electronics", "telecommunication", "electrical", "instrumentation", "power"]):
        return "Electronics & Electrical"
    if any(k in name_lower for k in ["mechanical", "robotics", "automation", "mechatronics", "automobile", "production"]):
        return "Mechanical & Automation"
    if any(k in name_lower for k in ["civil", "environmental", "infrastructure", "structural"]):
        return "Civil & Environmental"
    if any(k in name_lower for k in ["chemical", "biotechnology", "bio technology", "food", "petro", "plastic", "textile"]):
        return "Chemical & Biotech"
        
    return "Other Engineering Disciplines"
