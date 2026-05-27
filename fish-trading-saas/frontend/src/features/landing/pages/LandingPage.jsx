
import React from 'react';
import Hero from "../../../components/landing/Hero";
import Container from "../../../components/ui/Container";
import SocialProof from "../../../components/landing/SocialProof";
import Problem from "../components/Problem";
import Solution from "../components/Solution";
import Features from "../../../components/landing/Features";
import ProductPreview from "../../../components/landing/ProductPreview";
import Pricing from "../../../components/landing/Pricing";
import FinalCTA from "../../../components/landing/FinalCTA";
import Footer from "../../../components/landing/Footer";

const LandingPage = () => {
  return (
    <div className="bg-white min-h-screen flex flex-col">
      <Hero />
      <SocialProof />
      <Container>
        <Problem />
        <Solution />
        <Features />
        <ProductPreview />
        <Pricing />
      </Container>
      <FinalCTA />
      <Footer />
    </div>
  );
};

export default LandingPage;
