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
  let progressUpdateInterval = null;

  // Function to fetch real-time group order progress
  async function fetchGroupOrderProgress(productId, productName) {
    try {
      const functions = firebase.app().functions('us-central1');
      const getGroupOrderProgress = functions.httpsCallable('getGroupOrderProgress');
      console.log('Fetching group order progress for product:', productName, 'with productId:', productId);
      
      const result = await getGroupOrderProgress({
        productId: productId,
        product_name: productName
      });
      console.log('Group order progress result:', result);
      return result.data;
    } catch (error) {
      console.error('Error fetching group order progress:', error);
      return {
        currentCount: 0,
        maxCount: null,
        message: "Unable to fetch progress"
      };
    }
  }

  // Function to update progress display
  function updateProgressDisplay(progressData) {
    if (progressData.maxCount) {
      modalProgress.textContent = `Current progress: ${progressData.currentCount} / ${progressData.maxCount}`;
    } else {
      modalProgress.textContent = progressData.message || "No active group order";
    }
  }

  // Function to start periodic progress updates
  function startProgressUpdates(productId, productName) {
    // Clear any existing interval
    if (progressUpdateInterval) {
      clearInterval(progressUpdateInterval);
    }
    
    // Initial fetch
    fetchGroupOrderProgress(productId, productName).then(updateProgressDisplay);
    
    // Set up periodic updates every 10 seconds
    progressUpdateInterval = setInterval(async () => {
      const progressData = await fetchGroupOrderProgress(productId, productName);
      updateProgressDisplay(progressData);
    }, 10000); // Update every 10 seconds
  }

  // Function to stop progress updates
  function stopProgressUpdates() {
    if (progressUpdateInterval) {
      clearInterval(progressUpdateInterval);
      progressUpdateInterval = null;
    }
  }

  // Function to show thank you modal
  function showThankYouModal(orderType, orderData) {
    const thankYouModal = document.getElementById('thankYouModal');
    const thankYouLoading = document.getElementById('thankYouLoading');
    const directOrderThankYou = document.getElementById('directOrderThankYou');
    const groupOrderThankYou = document.getElementById('groupOrderThankYou');
    
    // Show loading state first
    thankYouModal.style.display = 'flex';
    thankYouLoading.style.display = 'block';
    directOrderThankYou.style.display = 'none';
    groupOrderThankYou.style.display = 'none';
    
    // Close the payment modal
    closeModal();
    
    // Set arrival time (3 days from now)
    const arrivalDate = new Date();
    arrivalDate.setDate(arrivalDate.getDate() + 3);
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    const arrivalTime = arrivalDate.toLocaleDateString('en-US', options);
    
    // Simulate processing time
    setTimeout(() => {
      thankYouLoading.style.display = 'none';
      
      if (orderType === 'direct') {
        // Show direct order layout
        directOrderThankYou.style.display = 'block';
        
        // Populate direct order data
        document.getElementById('modalDirectProduct').textContent = orderData.product;
        document.getElementById('modalDirectAmount').textContent = `$${orderData.amount}`;
        document.getElementById('modalDirectOrderNumber').textContent = orderData.orderNumber;
        document.getElementById('modalDirectArrivalTime').textContent = arrivalTime;
      } else {
        // Show group order layout
        groupOrderThankYou.style.display = 'block';
        
        // Populate group order data
        document.getElementById('modalGroupProduct').textContent = orderData.product;
        document.getElementById('modalGroupAmount').textContent = `$${orderData.amount}`;
        document.getElementById('modalGroupProgress').textContent = `${orderData.currentProgress} / ${orderData.maxProgress}`;
        document.getElementById('modalGroupArrivalTime').textContent = arrivalTime;
        
        // Calculate and set progress bar
        const progressPercentage = (orderData.currentProgress / orderData.maxProgress) * 100;
        document.getElementById('modalProgressFill').style.width = `${progressPercentage}%`;
        
        // Start real-time progress updates for group orders
        if (orderData.productId) {
          startModalProgressUpdates(orderData.productId, orderData.product);
        }
      }
    }, 1500); // Show loading for 1.5 seconds
  }

  // Function to start progress updates for modal group orders
  function startModalProgressUpdates(productId, productName) {
    // Initial fetch
    fetchGroupOrderProgress(productId, productName).then(updateModalGroupProgress);
    
    // Set up periodic updates every 10 seconds
    const modalProgressInterval = setInterval(async () => {
      const progressData = await fetchGroupOrderProgress(productId, productName);
      updateModalGroupProgress(progressData);
    }, 10000);
    
    // Store interval for cleanup
    window.modalProgressInterval = modalProgressInterval;
  }

  // Function to update modal group progress
  function updateModalGroupProgress(progressData) {
    if (progressData.maxCount) {
      const progressPercentage = (progressData.currentCount / progressData.maxCount) * 100;
      document.getElementById('modalGroupProgress').textContent = `${progressData.currentCount} / ${progressData.maxCount}`;
      document.getElementById('modalProgressFill').style.width = `${progressPercentage}%`;
      
      // Check if group is filled
      if (progressData.currentCount >= progressData.maxCount) {
        showModalGroupFilledNotification();
      }
    }
  }

  // Function to show modal group filled notification
  function showModalGroupFilledNotification() {
    const notification = document.getElementById('modalGroupFilledNotification');
    const nextSteps = document.getElementById('modalGroupNextSteps');
    
    notification.style.display = 'block';
    nextSteps.innerHTML = `
      <p class="mil-mb-20"><strong>What happens next?</strong></p>
      <ul style="text-align: left; color: #666;">
        <li>Your group order has been filled!</li>
        <li>We'll send pickup location details within 24 hours</li>
        <li>You'll receive SMS and email confirmations</li>
      </ul>
    `;
  }

  // Function to close thank you modal
  function closeThankYouModal() {
    const thankYouModal = document.getElementById('thankYouModal');
    thankYouModal.style.display = 'none';
    
    // Stop modal progress updates
    if (window.modalProgressInterval) {
      clearInterval(window.modalProgressInterval);
      window.modalProgressInterval = null;
    }
  }

  // Add event listeners for thank you modal
  document.addEventListener('DOMContentLoaded', function() {
    const thankYouModalClose = document.getElementById('thankYouModalClose');
    const thankYouModal = document.getElementById('thankYouModal');
    
    if (thankYouModalClose) {
      thankYouModalClose.addEventListener('click', closeThankYouModal);
    }
    
    if (thankYouModal) {
      thankYouModal.addEventListener('click', (e) => {
        if (e.target === thankYouModal) {
          closeThankYouModal();
        }
      });
    }
  });

  // Test function for debugging
  function testThankYouModal() {
    console.log('Testing thank you modal...');
    showThankYouModal('direct', {
      product: 'Test Product',
      amount: '2.99',
      orderNumber: 'TEST-123'
    });
  }

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
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const product = btn.getAttribute('data-product');
      const solo = btn.getAttribute('data-solo');
      const group = btn.getAttribute('data-group');
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
      modalSave.textContent = save;

      // Show loading state for progress
      modalProgress.textContent = "Loading progress...";

      // Reset form
      paymentForm.style.display = 'none';
      soloOrderSection.style.display = 'block';
      groupOrderSection.style.display = 'block';
      customerName.value = '';
      customerEmail.value = '';
      cardErrors.textContent = '';

      modalOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';

      // Fetch real-time progress and start updates
      startProgressUpdates(productId, product);
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
    
    // Stop progress updates when modal is closed
    stopProgressUpdates();
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
          // Update order status
          const updateDirectOrderStatus = functions.httpsCallable('updateDirectOrderStatus');
          await updateDirectOrderStatus({
            orderId: orderId,
            status: 'captured',
            paymentIntentId: paymentIntent.id
          });
          
          // Show thank you modal for direct order
          showThankYouModal('direct', {
            product: currentProduct,
            amount: currentSolo,
            orderNumber: orderId
          });
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
          
          // Get current progress for modal
          const progressData = await fetchGroupOrderProgress(currentProductId, currentProduct);
          
          // Show thank you modal for group order
          showThankYouModal('group', {
            product: currentProduct,
            amount: currentGroup,
            currentProgress: progressData.currentCount,
            maxProgress: progressData.maxCount,
            productId: currentProductId
          });
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