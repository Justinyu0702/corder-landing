// beta.js

document.addEventListener('DOMContentLoaded', () => {
  // Modal elements
  const modalOverlay = document.getElementById('milOrderModal');
  const modalClose = document.getElementById('milModalClose');
  const modalProduct = document.getElementById('milModalProduct');
  const modalProgress = document.getElementById('milModalProgress');
  const modalSave = document.getElementById('milModalSave');
  const buySoloBtn = document.getElementById('milBuySolo');
  const joinGroupBtn = document.getElementById('milJoinGroup');

  let currentProduct = null;
  let currentSolo = null;
  let currentGroup = null;

  // Show modal with product info
  document.querySelectorAll('.mil-order-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const product = btn.getAttribute('data-product');
      const solo = btn.getAttribute('data-solo');
      const group = btn.getAttribute('data-group');
      const progress = btn.getAttribute('data-progress');
      const goal = btn.getAttribute('data-goal');
      const save = (parseFloat(solo) - parseFloat(group)).toFixed(2);

      currentProduct = product;
      currentSolo = solo;
      currentGroup = group;

      modalProduct.textContent = product;
      buySoloBtn.innerHTML = `<span>Buy Solo - $${solo}</span>`;
      joinGroupBtn.innerHTML = `<span>Join Group - $${group}</span>`;
      modalProgress.textContent = `Current progress: ${progress} / ${goal}`;
      modalSave.textContent = save;

      modalOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });

  // Hide modal
  function closeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }
  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // Handle form submission for solo orders
  buySoloBtn.addEventListener('click', async function() {
    try {
      buySoloBtn.innerHTML = `<span>Processing...</span>`;
      buySoloBtn.disabled = true;
      const name = prompt('Please enter your name:');
      const email = prompt('Please enter your email:');
      if (!name || !email) {
        alert('Name and email are required');
        buySoloBtn.innerHTML = `<span>Buy Solo - $${currentSolo}</span>`;
        buySoloBtn.disabled = false;
        return;
      }
      const product = currentProduct;
      const orderType = 'solo';
      // Use Firebase Functions httpsCallable
      const functions = firebase.app().functions('us-central1');
      const createCheckoutSession = functions.httpsCallable('createCheckoutSession');
      const result = await createCheckoutSession({
        name,
        email,
        product,
        orderType
      });
      if (result.data && result.data.url) {
        window.location.href = result.data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('There was an error processing your order. Please try again.');
      buySoloBtn.innerHTML = `<span>Buy Solo - $${currentSolo}</span>`;
      buySoloBtn.disabled = false;
    }
  });

  // Handle form submission for group orders
  joinGroupBtn.addEventListener('click', async function() {
    try {
      joinGroupBtn.innerHTML = `<span>Processing...</span>`;
      joinGroupBtn.disabled = true;
      const name = prompt('Please enter your name:');
      const email = prompt('Please enter your email:');
      if (!name || !email) {
        alert('Name and email are required');
        joinGroupBtn.innerHTML = `<span>Join Group - $${currentGroup}</span>`;
        joinGroupBtn.disabled = false;
        return;
      }
      const product = currentProduct;
      const orderType = 'group';
      //const amount = currentGroup;
      // Use Firebase Functions httpsCallable
      const functions = firebase.app().functions('us-central1');
      const createCheckoutSession = functions.httpsCallable('createCheckoutSession');
      const result = await createCheckoutSession({
        name,
        email,
        product,
        orderType,
      });
      if (result.data && result.data.url) {
        window.location.href = result.data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('There was an error processing your order. Please try again.');
      joinGroupBtn.innerHTML = `<span>Join Group - $${currentGroup}</span>`;
      joinGroupBtn.disabled = false;
    }
  });
}); 