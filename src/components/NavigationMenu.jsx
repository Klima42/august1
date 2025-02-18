import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Home, MessageSquare, ChefHat, UserCircle } from 'lucide-react';

// 1. Import your Supabase client
import { supabase } from '../lib/supabase'; // Adjust the relative path as needed

const NavigationMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // 2. State to store test query result
  const [testResult, setTestResult] = useState(null);

  // 3. Run a test query on component mount (or at some trigger)
  useEffect(() => {
    async function testSupabaseConnection() {
      try {
        // Try selecting all rows from a known table (e.g. 'profiles')
        const { data, error } = await supabase
          .from('profiles')
          .select('*');

        if (error) {
          console.error('Supabase error:', error);
          setTestResult('Error: ' + error.message);
        } else {
          console.log('Supabase data:', data);
          setTestResult(JSON.stringify(data, null, 2));
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setTestResult('Unexpected error: ' + err.message);
      }
    }

    testSupabaseConnection();
  }, []);

  const menuItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/chat', label: 'Auguste Chat', icon: MessageSquare },
    { path: '/kitchen', label: 'Enter Kitchen', icon: ChefHat },
    { path: '/profile', label: 'Create Profile', icon: UserCircle },
  ];

  const handleNavigate = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all border border-[#E5D3B3] text-[#B87333] hover:bg-[#FFF5EB]"
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </motion.button>

      {/* Menu Items */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-20"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="absolute top-14 right-0 bg-white rounded-lg shadow-xl border border-[#E5D3B3] overflow-hidden min-w-[200px]"
            >
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <motion.button
                    key={item.path}
                    onClick={() => handleNavigate(item.path)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FFF5EB] transition-colors ${
                      index !== menuItems.length - 1 ? 'border-b border-[#E5D3B3]' : ''
                    } ${isActive ? 'bg-[#FFF5EB] text-[#B87333]' : 'text-gray-700'}`}
                    whileHover={{ x: 4 }}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </motion.button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Just for demonstration: show the result of our test query */}
      {testResult && (
        <div className="absolute bottom-0 left-0 m-4 p-2 bg-white shadow-md rounded-lg w-64 text-sm text-gray-800 max-h-48 overflow-auto">
          <strong>Test Query Result:</strong>
          <pre>{testResult}</pre>
        </div>
      )}
    </div>
  );
};

export default NavigationMenu;
