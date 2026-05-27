import CompanyTable from "../components/CompanyTable";

export default function CompaniesPage() {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">All Companies</h2>
      <CompanyTable />
    </div>
  );
}
