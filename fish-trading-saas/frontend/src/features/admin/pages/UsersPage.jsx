import UserTable from "../components/UserTable";

export default function UsersPage() {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">All Users</h2>
      <UserTable />
    </div>
  );
}
