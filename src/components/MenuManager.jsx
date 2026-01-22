import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { menuData } from '../data/menuData';
import './MenuManager.css';

const MenuManager = () => {
  const [menuItems, setMenuItems] = useState({
    hut: [],
    cafe: [],
    restaurant: []
  });

  const [restaurantStatus, setRestaurantStatus] = useState({
    hut: true,
    cafe: true,
    restaurant: true
  });

  const [activeCategory, setActiveCategory] = useState('hut');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    inStock: true,
    image: '',
    category: ''
  });

  const categories = [
    { id: 'hut', label: 'Hut' },
    { id: 'cafe', label: 'Cafe' },
    { id: 'restaurant', label: 'Restaurant' }
  ];

  // Fetch menu items from Firestore
  useEffect(() => {
    const q = query(collection(db, 'menuItems'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = { hut: [], cafe: [], restaurant: [] };
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (items[data.category]) {
          items[data.category].push({ id: doc.id, ...data });
        }
      });
      setMenuItems(items);
    });

    return () => unsubscribe();
  }, []);

  const handleAdd = async () => {
    if (!formData.name || !formData.price) return;

    try {
      await addDoc(collection(db, 'menuItems'), {
        name: formData.name,
        price: parseFloat(formData.price),
        description: formData.description,
        inStock: formData.inStock,
        category: activeCategory,
        image: formData.image || null,
        createdAt: new Date()
      });
      resetForm();
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("Error adding item");
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      price: item.price.toString(),
      description: item.description || '',
      inStock: item.inStock,
      image: item.image || '',
      category: item.category
    });
    setIsAdding(true);
  };

  const handleUpdate = async () => {
    if (!formData.name || !formData.price) return;

    try {
      const itemRef = doc(db, 'menuItems', editingId);
      await updateDoc(itemRef, {
        name: formData.name,
        price: parseFloat(formData.price),
        description: formData.description,
        inStock: formData.inStock,
        image: formData.image || null
      });
      resetForm();
    } catch (error) {
      console.error("Error updating document: ", error);
      alert("Error updating item");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteDoc(doc(db, 'menuItems', id));
      } catch (error) {
        console.error("Error deleting document: ", error);
        alert("Error deleting item");
      }
    }
  };

  const toggleStock = async (item) => {
    try {
      const itemRef = doc(db, 'menuItems', item.id);
      await updateDoc(itemRef, {
        inStock: !item.inStock
      });
    } catch (error) {
      console.error("Error updating stock: ", error);
    }
  };

  const toggleRestaurantStatus = () => {
    // Ideally this should also be stored in Firebase 'settings' collection
    setRestaurantStatus({
      ...restaurantStatus,
      [activeCategory]: !restaurantStatus[activeCategory]
    });
  };

  const resetForm = () => {
    setFormData({ name: '', price: '', description: '', inStock: true, image: '', category: '' });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSeedData = async () => {
    if (!window.confirm('This will upload all items from menuData.js to your Firebase. Proceed?')) return;

    try {
      const batch = writeBatch(db);
      const itemsCollection = collection(db, 'menuItems');

      // Loop through all categories in menuData
      const categoriesToSeed = ['cafe', 'restaurant', 'hut'];

      for (const cat of categoriesToSeed) {
        const items = menuData[cat];
        if (items) {
          items.forEach(item => {
            const newDocRef = doc(itemsCollection);
            batch.set(newDocRef, {
              name: item.name,
              price: item.price,
              description: item.description || '',
              inStock: item.inStock ?? true,
              category: cat,
              image: item.image || null,
              createdAt: new Date()
            });
          });
        }
      }

      await batch.commit();
      alert('Data seeded successfully!');
    } catch (error) {
      console.error("Error seeding data: ", error);
      alert("Error seeding data. Check your Firebase credentials.");
    }
  };

  return (
    <div className="menu-manager">
      <div className="category-tabs">
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => {
              setActiveCategory(cat.id);
              resetForm();
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="menu-content">
        <div className="menu-header">
          <h3 className="category-title">{categories.find(c => c.id === activeCategory)?.label} Menu</h3>
          <div className="header-actions">
            <button
              className={`status-toggle ${restaurantStatus[activeCategory] ? 'open' : 'closed'}`}
              onClick={toggleRestaurantStatus}
            >
              {restaurantStatus[activeCategory] ? (
                <>
                  <ToggleRight size={20} />
                  Open
                </>
              ) : (
                <>
                  <ToggleLeft size={20} />
                  Closed
                </>
              )}
            </button>
            <button className="seed-data-btn" onClick={handleSeedData} title="Upload menuData.js to Firebase">
              Seed Firebase Data
            </button>
            {!isAdding && !editingId && (
              <button className="add-item-btn" onClick={() => setIsAdding(true)}>
                <Plus size={20} />
                Add Item
              </button>
            )}
          </div>
        </div>

        {(isAdding || editingId) && (
          <div className="item-form">
            <div className="form-row">
              <input
                type="text"
                placeholder="Item Name"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <input
                type="number"
                placeholder="Price (₹)"
                className="form-input"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
            <textarea
              placeholder="Description (optional)"
              className="form-textarea"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <input
              type="text"
              placeholder="Image URL (optional)"
              className="form-input"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
            />
            <div className="stock-toggle-form">
              <label className="stock-label">
                <input
                  type="checkbox"
                  checked={formData.inStock}
                  onChange={(e) => setFormData({ ...formData, inStock: e.target.checked })}
                />
                <span>In Stock</span>
              </label>
            </div>
            <div className="form-actions">
              <button className="save-btn" onClick={editingId ? handleUpdate : handleAdd}>
                <Save size={16} />
                {editingId ? 'Update' : 'Save'}
              </button>
              <button className="cancel-btn" onClick={resetForm}>
                <X size={16} />
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="menu-items-list">
          {menuItems[activeCategory].length === 0 ? (
            <div className="empty-menu">
              <p>No items in this category yet. Click "Add Item" to get started.</p>
            </div>
          ) : (
            menuItems[activeCategory].map(item => (
              <div key={item.id} className={`menu-item-card ${!item.inStock ? 'out-of-stock' : ''}`}>
                {item.image && (
                  <div className="item-image">
                    <img src={item.image} alt={item.name} />
                  </div>
                )}
                <div className="item-info">
                  <div className="item-header">
                    <h4 className="item-name">{item.name}</h4>
                    {!item.inStock && <span className="stock-badge">Out of Stock</span>}
                  </div>
                  {item.description && <p className="item-description">{item.description}</p>}
                  <p className="item-price">₹{item.price.toFixed(2)}</p>
                </div>
                <div className="item-actions">
                  <button
                    className={`stock-toggle-btn ${item.inStock ? 'in-stock' : 'out-stock'}`}
                    onClick={() => toggleStock(item)}
                    title={item.inStock ? 'Mark as Out of Stock' : 'Mark as In Stock'}
                  >
                    {item.inStock ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                  <button className="edit-btn" onClick={() => handleEdit(item)}>
                    <Edit2 size={18} />
                  </button>
                  <button className="delete-btn" onClick={() => handleDelete(item.id)}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuManager;
