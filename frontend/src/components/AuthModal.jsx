import React, { useEffect } from 'react';
import useAuthStore from '/Users/mbp/Documents/biddify/frontend/src/services/authStore.js';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';

const AuthModal = () => {
   const { isAuthModalOpen, authModalView, setAuthModalView, closeAuthModal, clearError } = useAuthStore(/* ...selector */);

   useEffect(() => { /* ... clear error logic as before ... */ }, [isAuthModalOpen, authModalView, clearError]);

   const handleClose = () => closeAuthModal();

   if (!isAuthModalOpen) return null; // Don't render if closed

   return (
      <div className="modal modal-open modal-bottom sm:modal-middle" onClick={handleClose} role="dialog" aria-modal="true">
        <div className="modal-box relative bg-base-200 shadow-xl rounded-lg px-6 py-8 sm:px-8 sm:py-10 max-w-md" onClick={e => e.stopPropagation()}>
          <button className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3 text-base-content/50 hover:bg-base-300" onClick={handleClose} aria-label="Close modal">✕</button>

          {/* Tabs using daisyUI component */}
          <div role="tablist" className="tabs tabs-boxed grid grid-cols-2 mb-6 bg-base-100">
             <a role="tab"
               className={`tab text-sm font-semibold ${authModalView === 'signup' ? 'tab-active !bg-primary text-primary-content' : ''}`}
               onClick={() => setAuthModalView('signup')}
              > Sign up </a>
             <a role="tab"
                className={`tab text-sm font-semibold ${authModalView === 'login' ? 'tab-active !bg-primary text-primary-content' : ''}`}
                onClick={() => setAuthModalView('login')}
             > Log in </a>
          </div>

          {authModalView === 'signup' ? <SignupForm /> : <LoginForm />}
        </div>
      </div>
   );
};
export default AuthModal;