import { auth } from "@/auth";
import LogoutButton from "@/components/LogoutButton";

export default async function Header() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  return (
    <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
      <span className="font-semibold text-rose-600">Rosebud School Portal</span>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-600">
          {session.user.username} · {session.user.role}
        </span>
        <LogoutButton />
      </div>
    </header>
  );
}