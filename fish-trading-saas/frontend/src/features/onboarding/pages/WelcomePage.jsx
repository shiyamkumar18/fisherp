import React from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";

export default function WelcomePage() {
  const navigate = useNavigate();
  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <Card className="max-w-lg w-full p-8 text-center shadow-xl">
        <h1 className="text-3xl font-bold mb-2">Welcome to FisherP <span role="img" aria-label="fish">🐟</span></h1>
        <p className="mb-6 text-gray-600">Manage your fish trading business easily.<br/>Let's get you set up in a few quick steps.</p>
        <Button
          className="mt-4 w-full text-lg py-3"
          onClick={() => navigate("/onboarding/company")}
        >
          Get Started
        </Button>
      </Card>
    </div>
  );
}
