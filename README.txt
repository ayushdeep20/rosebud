WHAT'S IN THIS ZIP
-------------------
app/api/fees/student/route.ts

HOW TO APPLY
-------------------
1. Extract this zip.
2. Copy the app/api/fees/student/route.ts file into your project at the
   exact same path: C:\Users\hp\Projects\rosebud\app\api\fees\student\route.ts
   (create the "student" folder if VS Code shows it as empty/missing.)
3. Restart pnpm dev.

WHAT IT DOES
-------------------
GET /api/fees/student
  - Must be logged in as a STUDENT.
  - Returns that student's own fee dues (month-wise) and payment history
    for the current academic year (the one marked isCurrent in the DB).
  - Optional: GET /api/fees/student?academicYearId=xxxx to look at a
    different year.

This is read-only and additive -- it does not modify any existing file,
so it cannot break anything that currently works. It does not yet have
a page calling it; wire it into app/student/fees/page.tsx (or a new
page) whenever you're ready, or tell Claude to do that next.

TESTING
-------------------
1. Log in as a student who has fee dues.
2. Visit http://localhost:3000/api/fees/student directly in the browser
   -- you should see JSON with "student", "academicYear", "summary",
   "dues", and "payments".
3. Log in as anyone who is NOT a student (admin/teacher) and visit the
   same URL -- you should get {"error":"Forbidden"} instead of data.
