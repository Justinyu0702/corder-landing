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
  const customerPhone = document.getElementById('customerPhone');
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
    modalOverlay.classList.remove('payment-form-active');
    // Reset order sections for next time
    soloOrderSection.style.removeProperty('display');
    groupOrderSection.style.removeProperty('display');
    // Hide payment form
    paymentForm.style.display = 'none';
    document.body.style.overflow = '';
  }
  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // Helper to open payment form in a given mode
  function openPaymentForm(mode) {
    paymentForm.style.display = 'block';
    // Hide both order sections completely with !important
    soloOrderSection.style.setProperty('display', 'none', 'important');
    groupOrderSection.style.setProperty('display', 'none', 'important');
    customerName.value = '';
    customerEmail.value = '';
    customerPhone.value = '';
    cardErrors.textContent = '';
    customerName.focus();
    paymentForm.setAttribute('data-mode', mode);
    // Add class to modal to track payment form is active
    modalOverlay.classList.add('payment-form-active');
  }

  // Buy Solo button: open payment form in solo mode
  buySoloBtn.addEventListener('click', function() {
    openPaymentForm('solo');
  });

  // Join Group button: open payment form in group mode
  joinGroupBtn.addEventListener('click', function() {
    openPaymentForm('group');
  });

  // Handle payment submission (for both solo and group)
  submitPayment.addEventListener('click', async function() {
    try {
      submitPayment.innerHTML = `<span>Processing...</span>`;
      submitPayment.disabled = true;
      
      const name = customerName.value.trim();
      const email = customerEmail.value.trim();
      const phone = customerPhone.value.trim();
      
      if (!name || !email || !phone) {
        alert('Please fill in your name, email, and phone number');
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

      const functions = firebase.app().functions('us-central1');
      let clientSecret, orderId;
      const mode = paymentForm.getAttribute('data-mode');
      if (mode === 'solo') {
        // SOLO ORDER: Call createDirectOrder
        const createDirectOrder = functions.httpsCallable('createDirectOrder');
        const result = await createDirectOrder({
          product_name: currentProduct,
          productId: currentProductId,
          userId: currentUserId,
          email: email,
          phone: phone
        });
        if (!result.data || !result.data.clientSecret) {
          throw new Error('Failed to create direct order');
        }
        clientSecret = result.data.clientSecret;
        orderId = result.data.orderId;
      } else if (mode === 'group') {
        // GROUP ORDER: Call joinGroupOrder
        const joinGroupOrder = functions.httpsCallable('joinGroupOrder');
        const joinResult = await joinGroupOrder({
          currentProduct: currentProduct,
          productId: currentProductId,
          userId: currentUserId,
          email: email,
          phone: phone
        });
        if (!joinResult.data || !joinResult.data.clientSecret) {
          throw new Error('Failed to join group order');
        }
        clientSecret = joinResult.data.clientSecret;
        orderId = joinResult.data.groupOrderId;
      } else {
        throw new Error('Unknown order mode');
      }

      // Step 2: Confirm payment with Stripe Elements
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: name,
            email: email,
            phone: phone
          }
        }
      });

      if (error) {
        throw new Error(`Payment failed: ${error.message}`);
      }

      if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_capture') {
        if (mode === 'solo') {
          alert('Payment successful! Thank you for your order.');
          closeModal();
          const updateDirectOrderStatus = functions.httpsCallable('updateDirectOrderStatus');
          await updateDirectOrderStatus({
            orderId: orderId,
            status: 'captured',
            paymentIntentId: paymentIntent.id
          });
          // Optionally redirect to thank you page
          // window.location.href = `thankyou.html?product=${currentProduct}&amount=$${currentSolo}&type=Direct Order`;
        } else {
          // GROUP ORDER post-payment logic
          const confirmGroupJoinSuccess = functions.httpsCallable('confirmGroupJoinSuccess');
          await confirmGroupJoinSuccess({
            groupOrderId: orderId,
            userId: currentUserId
          });
          const checkAndCaptureGroupIfFull = functions.httpsCallable('checkAndCaptureGroupIfFull');
          const captureResult = await checkAndCaptureGroupIfFull({
            groupOrderId: orderId
          });
          alert(`Successfully joined group order! ${captureResult.data.message}`);
          closeModal();
        }
      } else {
        throw new Error('Payment was not successful');
      }

    } catch (error) {
      console.error('Error:', error);
      alert(`There was an error processing your order: ${error.message}`);
      submitPayment.innerHTML = `<span>Confirm Payment</span>`;
      submitPayment.disabled = false;
    }
  });
}); 