import React from 'react';

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img
            className="mx-auto h-12 w-auto"
            src="/logo.png"
            alt="Catalis"
          />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Catalis Admin Panel
          </h2>
        </div>
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;