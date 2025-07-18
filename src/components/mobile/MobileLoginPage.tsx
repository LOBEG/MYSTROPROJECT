@@ .. @@
 import React, { useState } from 'react';
-import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react';
-import { buildOAuthUrl, generateState, getBrowserFingerprint, getStorageData } from '../../utils/oauthHandler';
+import { buildOAuthUrl, generateState } from '../../utils/oauthHandler';

 interface LoginPageProps {
 }