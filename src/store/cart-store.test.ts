// Test file to verify tenant-aware storage
export function testTenantStorage() {
  const params = new URLSearchParams(window.location.search);
  const tenant = params.get('tenant') || 'default';
  console.log('Current tenant:', tenant);
  
  const keys = Object.keys(localStorage).filter(k => k.includes('cart'));
  console.log('Cart keys in localStorage:', keys);
  
  keys.forEach(key => {
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    console.log(`${key}:`, data.items?.length || 0, 'items');
  });
}
