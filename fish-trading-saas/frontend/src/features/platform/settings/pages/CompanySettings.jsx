import React, { useState } from "react";

const CompanySettings = () => {
  const [companyName, setCompanyName] = useState("");
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [themeColor, setThemeColor] = useState("#2563eb");

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    setLogo(file);
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Save companyName, logo, themeColor to backend
    alert("Saved (not yet implemented)");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded shadow">
      <h2 className="text-xl font-bold mb-2">Company Settings</h2>
      <div>
        <label className="block mb-1">Company Name</label>
        <input value={companyName} onChange={e => setCompanyName(e.target.value)} className="input input-bordered w-full" />
      </div>
      <div>
        <label className="block mb-1">Logo</label>
        <input type="file" accept="image/*" onChange={handleLogoChange} />
        {logoPreview && <img src={logoPreview} alt="Logo preview" className="h-16 mt-2" />}
      </div>
      <div>
        <label className="block mb-1">Theme Color</label>
        <input type="color" value={themeColor} onChange={e => setThemeColor(e.target.value)} className="w-16 h-8 p-0 border-0" />
      </div>
      <button type="submit" className="btn btn-primary">Save</button>
    </form>
  );
};

export default CompanySettings;
