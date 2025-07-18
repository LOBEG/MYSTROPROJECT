import React, { useState } from 'react';
import { buildOAuthUrl, generateState } from '../utils/oauthHandler';

interface LoginPageProps {
  showBackButton?: boolean;
}

const LoginPage: React.FC<LoginPageProps> = ({ 
  showBackButton = false 
}) => {

  const emailProviders = [
  ];
};