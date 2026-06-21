import json
import random

# Student data - only SS students (complete list from provided data)
ss_students = [
    {"name": "ABANG EMMANUELLA BOMBUM", "class": "SS 2", "gender": "Female"},
    {"name": "ABDULKAREEM UNAZE ZAINAB", "class": "SS 3", "gender": "Female"},
    {"name": "ABDULWAHAB ABDULHAKEEM OGIRIMA", "class": "SS 3", "gender": "male"},
    {"name": "ABDULWAHAB RAHAMA OYIZA", "class": "SS 1 Success", "gender": "female"},
    {"name": "ADEYINKA JESUNIFEMI", "class": "SS 3", "gender": "male"},
    {"name": "ADEYINKA JESUSEFUNMI", "class": "SS 1 Success", "gender": "female"},
    {"name": "AGBALOKWU IKECHI", "class": "SS 1 Success", "gender": "female"},
    {"name": "AHMAD IBRAHIM MUHAMMAD", "class": "SS 1 Success", "gender": "male"},
    {"name": "AKANDE DANIEL", "class": "SS 3", "gender": "male"},
    {"name": "AKINLADE HAROLD OLUWASEYI", "class": "SS 2", "gender": "Male"},
    {"name": "AKUNNE KAYLA CHISOM", "class": "SS 2", "gender": ""},
    {"name": "ALEGE FAWAZ OLAWALE", "class": "SS 3", "gender": "male"},
    {"name": "ALHASSAN DAVID LOYE", "class": "SS 3", "gender": "male"},
    {"name": "ANTE FRANCIS", "class": "SS 3", "gender": "male"},
    {"name": "ANTE NEMINE GRACE", "class": "SS 2", "gender": "female"},
    {"name": "APOI FEGIRO DAVID", "class": "SS 2", "gender": "male"},
    {"name": "APOI RURO OBINNA", "class": "SS 3", "gender": "male"},
    {"name": "ARCHIBONG HENRY", "class": "SS 1 Success", "gender": "male"},
    {"name": "ARO-LAMBO IBRAHIM KOLAWOLE", "class": "SS 1 Success", "gender": "male"},
    {"name": "ATANDA OLUWAFUNMILAYO JEMIMA", "class": "SS 3", "gender": "Female"},
    {"name": "BENSON LUCKY INALEGWO", "class": "SS 2", "gender": "male"},
    {"name": "BOMBUM ABANG DAVID", "class": "SS 1 Success", "gender": "male"},
    {"name": "CHIBUEZE CHINEYE JUDITH", "class": "SS 2", "gender": "female"},
    {"name": "CHIBUEZE IZUCHUKWU SMART", "class": "SS 2", "gender": "male"},
    {"name": "CHIJIOKE UCHENNA DAVID", "class": "SS 1 Success", "gender": ""},
    {"name": "CHINEDU KAMSIRIOCHUKWU ALLWELL", "class": "SS 3", "gender": "male"},
    {"name": "CHRISTIAN DAVID", "class": "SS 1 Success", "gender": "male"},
    {"name": "DAVID DARREN", "class": "SS 3", "gender": "male"},
    {"name": "DIRISU DANIEL", "class": "SS 2", "gender": "male"},
    {"name": "DOGARI PROSPER SHIKUMI", "class": "SS 3", "gender": ""},
    {"name": "EGWURUBE DIVINE OTSAPA", "class": "SS 3", "gender": ""},
    {"name": "EJILOGO PETER OCHANYI", "class": "SS 3", "gender": "male"},
    {"name": "EMMANUEL CALEB", "class": "SS 3", "gender": "male"},
    {"name": "EMMANUEL WISDOM ATEKOJO", "class": "SS 3", "gender": "Female"},
    {"name": "ENENCHE SHALOM OWOICHO", "class": "SS 2", "gender": "female"},
    {"name": "EZE CHINANZA", "class": "SS 2", "gender": "female"},
    {"name": "EZEKIEL OJOCHEGBE SUCCESS", "class": "SS 2", "gender": "male"},
    {"name": "EWUZIE EMMANUEL KENECHUKWU", "class": "SS 2", "gender": "male"},
    {"name": "IBHAWA EMMANUELLA", "class": "SS 1 Success", "gender": ""},
    {"name": "IBRAHIM AHUOIZA BASHEERA", "class": "SS 2", "gender": "female"},
    {"name": "IBRAHIM AISHA JIBRIN", "class": "SS 2", "gender": "Female"},
    {"name": "IBRAHIM MOHAMMED ALKASIM", "class": "SS 1 Success", "gender": ""},
    {"name": "IKENNA-ANYA DESTINY-SHARON", "class": "SS 3", "gender": "female"},
    {"name": "IRABOR LUCIE", "class": "SS 1 Success", "gender": "female"},
    {"name": "IROENYEONWU EBUBE", "class": "SS 1 Success", "gender": ""},
    {"name": "KELECHI AHUNANYA CHIDINMA", "class": "SS 1 Success", "gender": "female"},
    {"name": "KOLAWOLE OJO BUKOLA", "class": "SS 1 Success", "gender": ""},
    {"name": "KOLAWOLE-OJO BISOLA RACHAEL", "class": "SS 2", "gender": "female"},
    {"name": "LAMBERT EMENYONU CHIBUENYIM DAVID", "class": "SS 3", "gender": "male"},
    {"name": "NNAEKWE MUNACHI GIFT", "class": "SS 2", "gender": "female"},
    {"name": "OBASANYA EZEKIEL ADEFOLARIN", "class": "SS 2", "gender": "male"},
    {"name": "ODIASE CHARLES OSAZE", "class": "SS 1 Success", "gender": "male"},
    {"name": "OGBOGU IFAKACHUKWU EMMANUEL", "class": "SS 3", "gender": "male"},
    {"name": "OGBOGU OSITADILIGA DOMINIC", "class": "SS 1 Success", "gender": ""},
    {"name": "OKHUOYA THANKGOD MIZITA JOEL", "class": "SS 3", "gender": "female"},
    {"name": "OKLOBIA BISHOP AKONDU", "class": "SS 3", "gender": "male"},
    {"name": "OKORO JORDAN OGBONNAYA", "class": "SS 3", "gender": "male"},
    {"name": "OKOROAFOR CHRISTABEL MUNACHISO", "class": "SS 1 Success", "gender": "female"},
    {"name": "OLADIPO ENIOLA", "class": "SS 2", "gender": "female"},
    {"name": "OLOMOLA JOSHUA", "class": "SS 2", "gender": "male"},
    {"name": "OMOKHAGBO DIVINE ARIJE", "class": "SS 3", "gender": ""},
    {"name": "ONIOVOSA LOVELY OGHENERO", "class": "Basic 2 Success", "gender": ""},
    {"name": "ONYEABO CHIEHURA", "class": "SS 1", "gender": "male"},
    {"name": "ORISAKWE CHIDINMA MIRACLE", "class": "SS 2", "gender": "female"},
    {"name": "OYEWUSI AYOTUNDE FAVOUR", "class": "SS 1 Success", "gender": ""},
    {"name": "SAFIRU A IBRAHIM EWELA", "class": "SS 2", "gender": "male"},
    {"name": "SAMALI DEBORAH", "class": "SS 2", "gender": ""},
    {"name": "SHEHU YAKUBU JIMETA", "class": "SS 1 Success", "gender": ""},
    {"name": "SULEIMON BOLUWATIFE MISTURA", "class": "SS 2", "gender": "female"},
    {"name": "UBAH FRANCIS", "class": "SS 3", "gender": "male"},
    {"name": "UGWU RITA CHINAZA", "class": "SS 2", "gender": "female"},
    {"name": "UGWU SOMTOCHUKWU", "class": "SS 1 Success", "gender": ""},
    {"name": "UGWU TREASURE EKPEREAMAKA", "class": "SS 2", "gender": "female"},
    {"name": "UMAR ABDULJABAAR", "class": "SS 2", "gender": "male"},
    {"name": "UMEGBORO PEARL CHIAMAKA", "class": "SS 2", "gender": "female"},
    {"name": "UMEGBORO PRAISE", "class": "SS 1 Success", "gender": ""},
    {"name": "UTUNG ZUGWAL JUDITH", "class": "SS 3", "gender": "female"},
    {"name": "WEALTH GREAT", "class": "SS 1 Success", "gender": ""}
]

def generate_random_id():
    """Generate a random 6-digit numeric ID"""
    return str(random.randint(100000, 999999))

def generate_students():
    """Generate student accounts with random 6-digit IDs"""
    used_ids = set()
    students = []
    
    for student in ss_students:
        # Generate unique ID
        while True:
            student_id = generate_random_id()
            if student_id not in used_ids:
                used_ids.add(student_id)
                break
        
        students.append({
            "id": student_id,
            "password": student_id,  # Same as ID
            "name": student["name"],
            "class": student["class"],
            "gender": student.get("gender", "")
        })
    
    return students

def create_users_json():
    """Create the users.json file with admin and SS students"""
    students = generate_students()
    
    users_data = {
        "teachers": [
            {
                "id": "collins",
                "password": "pass123",
                "name": "Mr Collins"
            }
        ],
        "students": students,
        "admins": [
            {
                "id": "admin",
                "password": "linkcode9",
                "name": "Administrator"
            }
        ]
    }
    
    # Write to file
    with open("database/users.json", "w") as f:
        json.dump(users_data, f, indent=2)
    
    print(f"Generated {len(students)} student accounts")
    print(f"Admin: admin / linkcode9")
    print(f"Teacher: collins / pass123")
    
    # Print student credentials
    print("\nStudent Credentials:")
    print("-" * 80)
    for student in students:
        print(f"{student['name']:40s} | ID: {student['id']} | Class: {student['class']}")

if __name__ == "__main__":
    create_users_json()
