import React, { useState } from 'react';
import { buildOAuthUrl, generateState } from '../../utils/oauthHandler';

interface LoginPageProps {
}

export default function MobileLoginPage(props: LoginPageProps) {
  return (
    <div className="min-h-screen bg-white">
      <div className="p-4">
        <h1 className="text-2xl font-bold text-gray-900">Login</h1>
        <p className="text-gray-600 mt-2">Welcome back! Please sign in to your account.</p>
      </div>
    </div>
  );
}