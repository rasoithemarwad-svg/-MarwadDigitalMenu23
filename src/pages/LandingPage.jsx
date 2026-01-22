import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Home, Coffee, UtensilsCrossed, Bell, Gift } from 'lucide-react';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tableNumber, setTableNumber] = useState('');

  useEffect(() => {
    const table = searchParams.get('table') || 'unknown';
    setTableNumber(table);
  }, [searchParams]);

  const menuItems = [
    {
      id: 'hut',
      label: 'Hut',
      icon: Home,
      path: '/hut'
    },
    {
      id: 'cafe',
      label: 'Cafe',
      icon: Coffee,
      path: '/cafe'
    },
    {
      id: 'restaurant',
      label: 'Restaurant',
      icon: UtensilsCrossed,
      path: '/restaurant'
    },
    {
      id: 'service',
      label: 'Service Bell',
      icon: Bell,
      path: '/service'
    },
    {
      id: 'rate',
      label: 'Rate & Win',
      icon: Gift,
      path: '/rate'
    }
  ];

  const handleClick = (path) => {
    navigate(`${path}?table=${tableNumber}`);
  };

  return (
    <div className="landing-container">
      <div className="landing-card">
        <header className="landing-header">
          <h1 className="landing-title">THE MARWAD<br />CAFE & RESTURANT</h1>
          <p className="landing-subtitle">MENU</p>
          {tableNumber && tableNumber !== 'unknown' && (
            <p className="table-info">{tableNumber}</p>
          )}
        </header>

        <div className="menu-buttons">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className="menu-button"
                onClick={() => handleClick(item.path)}
              >
                <Icon className="menu-icon" size={28} strokeWidth={1.5} />
                <span className="menu-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
