import React, { createContext, useContext, useState } from 'react';

const translations = {
  en: {
    'buy_fish': 'Buy Fish',
    'sell_fish': 'Sell Fish',
    'stock': 'Stock',
    'pending_money': 'Pending Money',
    'payments': 'Payments',
    'customers': 'Customers',
    'create_invoice': 'Create Invoice',
    'save_purchase': 'Save Purchase',
    'settings': 'Settings',
    'logout': 'Logout',
    'dashboard': 'Dashboard',
    'reports': 'Reports',
    'voice_assistant': 'Voice Assistant',
    'speak_now': 'Speak now...',
    'market_prices': "Today's Fish Market Prices",
    'smart_suggestions': 'Smart Business Suggestions',
    'save': 'Save',
    'cancel': 'Cancel',
    'confirm': 'Confirm',
    'total': 'Total',
    'average': 'Average',
    'price_per_kg': 'Price per kg',
    'packages': 'Packages',
    'weight': 'Weight',
    'transport': 'Transport',
    'ice': 'Ice',
    'commission': 'Commission',
    'supplier': 'Supplier',
    'customer': 'Customer',
    'risk_score': 'Risk Score',
    'risk_category': 'Risk Category',
    'overdue': 'Overdue',
    'active': 'Active',
    'language': 'Language'
  },
  ta: {
    'buy_fish': 'மீன் வாங்கு',
    'sell_fish': 'மீன் விற்றல்',
    'stock': 'இருப்பு',
    'pending_money': 'நிலுவைத் தொகை',
    'payments': 'பணம் செலுத்துதல்',
    'customers': 'வாடிக்கையாளர்கள்',
    'create_invoice': 'பில் உருவாக்கு',
    'save_purchase': 'கொள்முதல் சேமி',
    'settings': 'அமைப்புகள்',
    'logout': 'வெளியேறு',
    'dashboard': 'டாஷ்போர்டு',
    'reports': 'அறிக்கைகள்',
    'voice_assistant': 'குரல் உதவியாளர்',
    'speak_now': 'இப்போது பேசுங்கள்...',
    'market_prices': 'இன்றைய மீன் சந்தை விலை',
    'smart_suggestions': 'புத்திசாலித்தனமான வணிக ஆலோசனைகள்',
    'save': 'சேமி',
    'cancel': 'ரத்துசெய்',
    'confirm': 'உறுதிசெய்',
    'total': 'மொத்தம்',
    'average': 'சராசரி',
    'price_per_kg': 'விலை / கிலோ',
    'packages': 'பெட்டிகள்',
    'weight': 'எடை',
    'transport': 'வண்டி வாடகை',
    'ice': 'ஐஸ் செலவு',
    'commission': 'கமிஷன்',
    'supplier': 'விற்பனையாளர்',
    'customer': 'வாடிக்கையாளர்',
    'risk_score': 'இடர் மதிப்பெண்',
    'risk_category': 'இடர் வகை',
    'overdue': 'நிலுவை',
    'active': 'செயலில்',
    'language': 'மொழி'
  },
  hi: {
    'buy_fish': 'मछली खरीदें',
    'sell_fish': 'मछली बेचें',
    'stock': 'स्टॉक',
    'pending_money': 'बकाया राशि',
    'payments': 'भुगतान',
    'customers': 'ग्राहक',
    'create_invoice': 'बिल बनाएं',
    'save_purchase': 'खरीद सहेजें',
    'settings': 'सेटिंग्स',
    'logout': 'लॉगआउट',
    'dashboard': 'डैशबोर्ड',
    'reports': 'रिपोर्ट',
    'voice_assistant': 'आवाज सहायक',
    'speak_now': 'अब बोलें...',
    'market_prices': 'आज मछली बाजार का भाव',
    'smart_suggestions': 'स्मार्ट व्यापार सुझाव',
    'save': 'सहेजें',
    'cancel': 'रद्द करें',
    'confirm': 'पुष्टि करें',
    'total': 'कुल',
    'average': 'औसत',
    'price_per_kg': 'मूल्य प्रति किलो',
    'packages': 'पैकेज',
    'weight': 'वजन',
    'transport': 'परिवहन',
    'ice': 'बर्फ',
    'commission': 'कमीशन',
    'supplier': 'आपूर्तिकर्ता',
    'customer': 'ग्राहक',
    'risk_score': 'जोखिम स्कोर',
    'risk_category': 'जोखिम श्रेणी',
    'overdue': 'बकाया',
    'active': 'सक्रिय',
    'language': 'भाषा'
  }
};

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('fisherp_lang') || 'en';
  });

  const changeLanguage = (newLang) => {
    setLang(newLang);
    localStorage.setItem('fisherp_lang', newLang);
  };

  const t = (key) => {
    return translations[lang]?.[key] || translations['en']?.[key] || key;
  };

  const voiceLangCode = () => {
    switch (lang) {
      case 'ta': return 'ta-IN';
      case 'hi': return 'hi-IN';
      default: return 'en-US';
    }
  };

  return (
    <LanguageContext.Provider value={{ lang, changeLanguage, t, voiceLangCode }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
