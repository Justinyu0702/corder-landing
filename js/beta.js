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
  
  // Payment form elements
  const soloOrderSection = document.getElementById('soloOrderSection');
  const groupOrderSection = document.getElementById('groupOrderSection');
  const paymentForm = document.getElementById('paymentForm');
  const customerName = document.getElementById('customerName');
  const customerEmail = document.getElementById('customerEmail');
  const submitPayment = document.getElementById('submitPayment');
  const cardErrors = document.getElementById('card-errors');

  let currentProduct = null;
  let currentSolo = null;
  let currentGroup = null;
  let currentProductId = null;
  let stripe = null;
  let cardElement = null;
  let currentClientSecret = null;
  let currentGroupOrderId = null;
  let currentUserId = null;

  // Initialize Stripe
  function initializeStripe() {
    if (typeof Stripe !== 'undefined') {
      stripe = Stripe('pk_test_51RlhEpP87QkK6cjNmrTJVT6EwuRzl8XlszhU4lNf3znG9QzKi9rEiOlc8FuxN0VNqByxOo9i1fGDpoAqKFZxU1ud003nCTU5W5');
      cardElement = stripe.elements().create('card', {
        style: {
          base: {
            fontSize: '14px',
            color: '#424770',
            '::placeholder': {
              color: '#aab7c4',
            },
          },
        },
      });
      cardElement.mount('#card-element');
      
      // Handle real-time validation errors
      cardElement.on('change', ({error}) => {
        if (error) {
          cardErrors.textContent = error.message;
        } else {
          cardErrors.textContent = '';
        }
      });
    }
  }

  // Initialize Stripe when page loads
  initializeStripe();

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
      const productId = btn.getAttribute('data-product-id');

      currentProduct = product;
      currentSolo = solo;
      currentGroup = group;
      currentProductId = productId;

      modalProduct.textContent = product;
      // Set modal button labels: label thin, price bold
      buySoloBtn.innerHTML = `<span style="font-weight:400;">Buy Solo</span><span style="font-weight:700;">$${solo}</span>`;
      joinGroupBtn.innerHTML = `<span style="font-weight:400;">Join Group</span><span style="font-weight:700;">$${group}</span>`;
      modalProgress.textContent = `Current progress: ${progress} / ${goal}`;
      modalSave.textContent = save;

      // Reset form
      paymentForm.style.display = 'none';
      soloOrderSection.style.display = 'block';
      groupOrderSection.style.display = 'block';
      customerName.value = '';
      customerEmail.value = '';
      cardErrors.textContent = '';

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

  // Handle group orders - show payment form
  joinGroupBtn.addEventListener('click', async function() {
    try {
      // Show payment form
      paymentForm.style.display = 'block';
      joinGroupBtn.style.display = 'none';
      
      // Focus on name input
      customerName.focus();
      
    } catch (error) {
      console.error('Error:', error);
      alert('There was an error. Please try again.');
    }
  });

  // Handle payment submission
  submitPayment.addEventListener('click', async function() {
    try {
      submitPayment.innerHTML = `<span>Processing...</span>`;
      submitPayment.disabled = true;
      
      const name = customerName.value.trim();
      const email = customerEmail.value.trim();
      
      if (!name || !email) {
        alert('Please fill in your name and email');
        submitPayment.innerHTML = `<span>Confirm Payment</span>`;
        submitPayment.disabled = false;
        return;
      }

      if (!stripe || !cardElement) {
        alert('Stripe is not loaded. Please refresh the page.');
        submitPayment.innerHTML = `<span>Confirm Payment</span>`;
        submitPayment.disabled = false;
        return;
      }

      // Generate user ID
      currentUserId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

      // Step 1: Join the group order
      const functions = firebase.app().functions('us-central1');
      const joinGroupOrder = functions.httpsCallable('joinGroupOrder');
      
      const joinResult = await joinGroupOrder({
        productId: currentProductId,
        userId: currentUserId,
        email: email
      });

      if (!joinResult.data || !joinResult.data.clientSecret) {
        throw new Error('Failed to join group order');
      }

      currentClientSecret = joinResult.data.clientSecret;
      currentGroupOrderId = joinResult.data.groupOrderId;

      // Step 2: Confirm payment with Stripe Elements
      const { error, paymentIntent } = await stripe.confirmCardPayment(currentClientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: name,
            email: email
          }
        }
      });

      if (error) {
        throw new Error(`Payment failed: ${error.message}`);
      }

      if (paymentIntent.status === 'requires_capture') {
        // Step 3: Confirm group join success
        const confirmGroupJoinSuccess = functions.httpsCallable('confirmGroupJoinSuccess');
        console.log("currentGroupOrderId", currentGroupOrderId);
        
        await confirmGroupJoinSuccess({
          groupOrderId: currentGroupOrderId,
          userId: currentUserId
        });

        // Step 4: Check if group is full and capture payments
        const checkAndCaptureGroupIfFull = functions.httpsCallable('checkAndCaptureGroupIfFull');
        const captureResult = await checkAndCaptureGroupIfFull({
          groupOrderId: currentGroupOrderId
        });

        // Show success message
        alert(`Successfully joined group order! ${captureResult.data.message}`);
        closeModal();
      } else {
        throw new Error('Payment was not authorized');
      }

    } catch (error) {
      console.error('Error:', error);
      alert(`There was an error processing your group order: ${error.message}`);
      submitPayment.innerHTML = `<span>Confirm Payment</span>`;
      submitPayment.disabled = false;
    }
  });
}); 