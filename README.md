# Peter Harvard International Schools — Exam System v1.0

## Setup
Double Click start.bat

## Access
- Student:  http://<LAN-IP>:3000/student.html
- Teacher:  http://<LAN-IP>:3000/teacher.html
- Admin:    http://<LAN-IP>:3000/admin.html

## Default Logins
| Role     | ID       | Password  |
|----------|----------|-----------|
| Teacher  | teacher1 | pass123   |
| Teacher  | teacher2 | pass123   |
| Student  | STU001   | (blank)   |
| Admin    | admin    | admin123  |

## New Features (v1.0 Updated)
- Subjects & classes (JSS1–JSS3, SS1–SS3)
- Exam active/inactive toggle (teacher can disable exams)
- Detailed CSV & JSON downloads (with student ID, class, subject)
- Single-result download per student
- Student list generation (CSV + JSON)
- Password reset for teachers and students (admin)
- Audit trail (admin)
- Charts & analytics (teacher + admin)
- Keyboard shortcuts: N=next, P=prev, A/B/C/D=select option
- Submit button locked until 60% answered
- Submit moved to question nav sidebar
- Responsive layout
- Loaders on all async actions

## Exam JSON Format
```json
{
  "exam": "Mathematics – Term 1",
  "subject": "Mathematics",
  "class": "JSS2",
  "duration": 30,
  "questions": [
    {
      "question": "What is 2 + 2?",
      "A": "3", "B": "4", "C": "5", "D": "6",
      "answer": "B"
    }
  ]
}
```

Developed by anointedthedeveloper
