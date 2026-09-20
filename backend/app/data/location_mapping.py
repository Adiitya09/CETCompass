import re
from typing import Tuple

REGIONS = {
    "Mumbai Region": ["Mumbai", "Thane", "Palghar", "Raigad", "Ratnagiri", "Sindhudurg"],
    "Pune Region": ["Pune", "Satara", "Kolhapur", "Solapur", "Sangli"],
    "Nashik / North Maharashtra": ["Nashik", "Ahmednagar", "Jalgaon", "Dhule", "Nandurbar"],
    "Chhatrapati Sambhajinagar (Marathwada)": ["Chhatrapati Sambhajinagar (Aurangabad)", "Jalna", "Beed", "Nanded", "Latur", "Parbhani", "Osmanabad (Dharashiv)", "Hingoli"],
    "Vidarbha": ["Nagpur", "Amravati", "Akola", "Yavatmal", "Wardha", "Chandrapur", "Buldhana", "Bhandara", "Gondia", "Gadchiroli", "Washim"]
}

COLLEGE_OVERRIDES = {
    "Abhinav Education Society's College of Engineering and Technology (Degree), Wadwadi": ("Satara", "Khandala", "Pune Region"),
    "Ajeenkya DY Patil School of Engineering": ("Pune", "Lohegaon", "Pune Region"),
    "Al-Ameen Educational and Medical Foundation, College of Engineering, Koregaon, Bhima": ("Pune", "Koregaon Bhima", "Pune Region"),
    "Dr. Babasaheb Ambedkar Technological University, Lonere": ("Raigad", "Lonere", "Mumbai Region"),
    "Dr.D.Y.Patil College Of Engineering & Innovation,Talegaon": ("Pune", "Talegaon Dabhade", "Pune Region"),
    "Everest Education Society, Group of Institutions (Integrated Campus), Ohar": ("Chhatrapati Sambhajinagar (Aurangabad)", "Ohar", "Chhatrapati Sambhajinagar (Marathwada)"),
    "Holy-Wood Academy's Sanjeevan Engineering and Technology Institute, Panhala": ("Kolhapur", "Panhala", "Pune Region"),
    "Hon. Shri. Babanrao Pachpute Vichardhara Trust , Group of Institutions (Integrated Campus)-Parikrama, Kashti Shrigondha,": ("Ahmednagar", "Kashti", "Nashik / North Maharashtra"),
    "International Centre Of Excellence In Engineering  and Management (ICEEM)": ("Chhatrapati Sambhajinagar (Aurangabad)", "Aurangabad", "Chhatrapati Sambhajinagar (Marathwada)"),
    "Jai Mahakali Shikshan Sanstha, Agnihotri College of Engineering, Sindhi(Meghe)": ("Wardha", "Sindhi", "Vidarbha"),
    "Jaihind College Of Engineering,Kuran": ("Pune", "Kuran", "Pune Region"),
    "Jamia Institute Of Engineering And Management Studies, Akkalkuwa": ("Nandurbar", "Akkalkuwa", "Nashik / North Maharashtra"),
    "Jaywant College of Engineering & Polytechnic , Kille Macchindragad Tal. Walva District- Sangali": ("Sangli", "Walva", "Pune Region"),
    "K J Somaiya Institute of Technology": ("Mumbai", "Sion", "Mumbai Region"),
    "Karmayogi Institute of Technology": ("Solapur", "Pandharpur", "Pune Region"),
    "Kavi Kulguru Institute of Technology & Science, Ramtek": ("Nagpur", "Ramtek", "Vidarbha"),
    "Late Shri. Vishnu Waman Thakur Charitable Trust, Viva Institute of Technology, Shirgaon": ("Palghar", "Virar", "Mumbai Region"),
    "M.D. Yergude Memorial Shikshan Prasarak Mandal's Shri Sai College of Engineering & Technology, Badravati": ("Chandrapur", "Bhadravati", "Vidarbha"),
    "Mahatma Basaweshwar Education Society's College of Engineering, Ambejogai": ("Beed", "Ambejogai", "Chhatrapati Sambhajinagar (Marathwada)"),
    "Navsahyadri Education Society's Group of Institutions": ("Pune", "Naigaon", "Pune Region"),
    "Paramhansa Ramkrishna Maunibaba Shikshan Santha's , Anuradha Engineering College, Chikhali": ("Buldhana", "Chikhali", "Vidarbha"),
    "Rajendra Mane College of Engineering & Technology  Ambav Deorukh": ("Ratnagiri", "Deorukh", "Mumbai Region"),
    "Sahakar Maharshee Shankarrao Mohite Patil Institute of Technology & Research, Akluj": ("Solapur", "Akluj", "Pune Region"),
    "Shree Gajanan Maharaj Shikshan Prasarak Manda'l Sharadchandra Pawar College of Engineering, Dumbarwadi": ("Pune", "Dumbarwadi", "Pune Region"),
    "Shri. Balasaheb Mane Shikshan  Prasarak Mandal's, Ashokrao Mane Group of Institutions": ("Kolhapur", "Vathar", "Pune Region"),
    "Shri.Someshwar Shikshan Prasarak Mandal, Sharadchandra Pawar College of Engineering & Technology , Someshwar Nagar": ("Pune", "Someshwar Nagar", "Pune Region"),
    "Siddhivinayak Technical Campus, School of Engineering & Research Technology, Shirasgon, Nile": ("Amravati", "Chandur Bazar", "Vidarbha"),
    "Universal College of Engineering & Research, Sasewadi": ("Pune", "Sasewadi", "Pune Region"),
    "Vishwatmak Jangli Maharaj Ashram Trust (Kokamthan), Atma Malik Institute Of Technology & Research": ("Ahmednagar", "Kopargaon", "Nashik / North Maharashtra"),
    "Yadavrao Tasgaonkar College of Engineering & Management": ("Raigad", "Karjat", "Mumbai Region"),
}

DISTRICT_KEYWORDS = {
    "Mumbai": (["Mumbai", "Matunga", "Andheri", "Bandra", "Chembur", "Kandivali", "Wadala", "Vile Parle", "Mahim", "Worli", "Dadar", "Sion", "Kurla", "Powai", "Borivali", "Ghatkopar", "Tardeo", "Byculla", "Mulund", "VJTI", "SPIT", "VESIT", "DJ Sanghvi", "Thadomal", "Sardar Patel College of Engineering"], "Mumbai Region"),
    "Pune": (["Pune", "COEP", "PICT", "Pimpri", "Akurdi", "Chinchwad", "Bibwewadi", "Karvenagar", "Dhankavdi", "Kondhwa", "Vadgaon", "Narhe", "Tathawade", "Ravet", "Wagholi", "Lonavala", "Pisoli", "Avasari", "Baramati", "Hadapsar", "Bhor", "Alandi", "Dighi", "Bavdhan", "Kothrud", "Wakad", "Hinjewadi", "Lavale", "Indapur", "Shirur"], "Pune Region"),
    "Nagpur": (["Nagpur", "Wanadongri", "Ramdeobaba", "Hingna", "Umrer"], "Vidarbha"),
    "Nashik": (["Nashik", "Sinnar", "Yeola", "Chandwad", "Dindori", "Igatpuri"], "Nashik / North Maharashtra"),
    "Thane": (["Thane", "Kalyan", "Dombivli", "Mira Road", "Bhayandar", "Ulhasnagar", "Badlapur", "Ambernath", "Shahapur"], "Mumbai Region"),
    "Palghar": (["Palghar", "Vasai", "Virar", "Boisar", "Dahanu", "Wada", "Kaman"], "Mumbai Region"),
    "Raigad": (["Raigad", "Panvel", "New Panvel", "Karjat", "Alibag", "Khopoli", "Rasayani", "Roha", "Mahad", "Pen", "Uran", "Taloja", "Khalapur", "Neral"], "Mumbai Region"),
    "Kolhapur": (["Kolhapur", "Ichalkaranji", "Jaysingpur", "Warananagar", "Gargoti", "Gadhinglaj", "Shirol"], "Pune Region"),
    "Ahmednagar": (["Ahmednagar", "Sangamner", "Loni", "Kopargaon", "Pravaranagar", "Rahuri", "Shrirampur", "Shevgaon"], "Nashik / North Maharashtra"),
    "Chhatrapati Sambhajinagar (Aurangabad)": (["Aurangabad", "Chhatrapati Sambhajinagar", "Paithan", "Gangapur", "Vaijapur", "Kannad"], "Chhatrapati Sambhajinagar (Marathwada)"),
    "Amravati": (["Amravati", "Badnera", "Achalpur", "Dhamangaon"], "Vidarbha"),
    "Solapur": (["Solapur", "Pandharpur", "Barshi", "Akkalkot", "Karmala", "Sangola", "Madha", "Mangalwedha"], "Pune Region"),
    "Sangli": (["Sangli", "Miraj", "Walchand", "Islampur", "Vita", "Tasgaon", "Ashta"], "Pune Region"),
    "Satara": (["Satara", "Karad", "Phaltan", "Wai", "Patan"], "Pune Region"),
    "Jalgaon": (["Jalgaon", "Bhusawal", "Chalisgaon", "Amalner", "Faizpur", "Jamner", "Pachora", "Yawal"], "Nashik / North Maharashtra"),
    "Dhule": (["Dhule", "Shirpur", "Sakri", "Dondaicha"], "Nashik / North Maharashtra"),
    "Nanded": (["Nanded", "Degloor", "Loha", "Mudkhed", "Mukhed", "Kinwat"], "Chhatrapati Sambhajinagar (Marathwada)"),
    "Latur": (["Latur", "Udgir", "Nilanga", "Ausa", "Ahmedpur"], "Chhatrapati Sambhajinagar (Marathwada)"),
    "Akola": (["Akola", "Balapur", "Akot", "Murtizapur"], "Vidarbha"),
    "Yavatmal": (["Yavatmal", "Pusad", "Darwha", "Wani", "Digras"], "Vidarbha"),
    "Chandrapur": (["Chandrapur", "Ballarpur", "Warora", "Bhadravati", "Rajura"], "Vidarbha"),
    "Wardha": (["Wardha", "Sevagram", "Hinganghat", "Arvi"], "Vidarbha"),
    "Buldhana": (["Buldhana", "Buldana", "Shegaon", "Khamgaon", "Malkapur", "Chikhli", "Mehkar"], "Vidarbha"),
    "Jalna": (["Jalna", "Ambad", "Partur", "Bhokardan"], "Chhatrapati Sambhajinagar (Marathwada)"),
    "Beed": (["Beed", "Ambajogai", "Parli", "Majalgaon", "Georai"], "Chhatrapati Sambhajinagar (Marathwada)"),
    "Osmanabad (Dharashiv)": (["Osmanabad", "Dharashiv", "Tuljapur", "Omerga", "Kalamb"], "Chhatrapati Sambhajinagar (Marathwada)"),
    "Parbhani": (["Parbhani", "Gangakhed", "Jintur", "Sailu"], "Chhatrapati Sambhajinagar (Marathwada)"),
    "Washim": (["Washim", "Risod", "Karanja", "Malegaon"], "Vidarbha"),
    "Gondia": (["Gondia", "Tirora"], "Vidarbha"),
    "Bhandara": (["Bhandara", "Tumsar", "Sakoli"], "Vidarbha"),
    "Ratnagiri": (["Ratnagiri", "Chiplun", "Khed", "Lanja", "Devrukh", "Rajapur"], "Mumbai Region"),
    "Sindhudurg": (["Sindhudurg", "Kankavli", "Sawantwadi", "Malvan", "Kudal", "Vengurla"], "Mumbai Region"),
    "Nandurbar": (["Nandurbar", "Shahada", "Navapur"], "Nashik / North Maharashtra"),
    "Gadchiroli": (["Gadchiroli", "Chamorshi", "Aheri"], "Vidarbha"),
    "Hingoli": (["Hingoli", "Basmath", "Kalamnuri"], "Chhatrapati Sambhajinagar (Marathwada)")
}

def resolve_location(college_name: str) -> Tuple[str, str, str]:
    """
    Returns (district, city, region) for any college in Maharashtra dataset.
    Never fabricates values.
    """
    if college_name in COLLEGE_OVERRIDES:
        return COLLEGE_OVERRIDES[college_name]
    
    for dist, (keywords, region) in DISTRICT_KEYWORDS.items():
        pattern = r'\b(' + '|'.join([re.escape(k) for k in keywords]) + r')\b'
        match = re.search(pattern, college_name, re.IGNORECASE)
        if match:
            return dist, match.group(0), region
            
    return "Maharashtra", "Other", "Maharashtra"
