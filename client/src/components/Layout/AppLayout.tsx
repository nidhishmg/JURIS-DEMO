import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import Sidebar from './Sidebar';
import RightPanel from './RightPanel';
import ChatArea from '../Chat/ChatArea';
import DraftGenerator from '../Draft/DraftGenerator';
import IPCBNSConverter from '../Tools/IPCBNSConverter';
import { Folder, Chat } from '@/types';
import { api } from '@/lib/api';

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  
  const [folders, setFolders] = useState<Folder[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeFolder, setActiveFolder] = useState<Folder | null>(null);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [showDraftGenerator, setShowDraftGenerator] = useState(false);
  const [showIPCBNSConverter, setShowIPCBNSConverter] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [isLoading1, setIsLoading1] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Load initial data
  useEffect(() => {
    if (isAuthenticated) {
      loadInitialData();
    }
  }, [isAuthenticated]);

  const loadInitialData = async () => {
    try {
      setIsLoading1(true);
      const [foldersData, chatsData] = await Promise.all([
        api.getUserFolders(),
        api.getUserChats(),
      ]);

      setFolders(foldersData);
      setChats(chatsData);
    } catch (error: any) {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setIsLoading1(false);
    }
  };

  const handleNewChat = async (folderId?: string, mode = 'general') => {
    try {
      const newChat = await api.createChat({
        folderId,
        mode,
        title: `New ${mode} chat`,
      });

      setChats(prev => [newChat, ...prev]);
      setActiveChat(newChat);
      
      if (folderId) {
        const folder = folders.find(f => f.id === folderId);
        setActiveFolder(folder || null);
      }
    } catch (error: any) {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized", 
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create new chat",
        variant: "destructive",
      });
    }
  };

  const handleSelectChat = (chat: Chat) => {
    setActiveChat(chat);
    if (chat.folderId) {
      const folder = folders.find(f => f.id === chat.folderId);
      setActiveFolder(folder || null);
    } else {
      setActiveFolder(null);
    }
  };

  const handleSelectFolder = (folder: Folder) => {
    setActiveFolder(folder);
    // Find the most recent chat in this folder
    const folderChats = chats.filter(c => c.folderId === folder.id);
    if (folderChats.length > 0) {
      setActiveChat(folderChats[0]);
    } else {
      // Create new chat in this folder
      handleNewChat(folder.id, 'case');
    }
  };

  const handleCreateFolder = async (folderData: any) => {
    try {
      const newFolder = await api.createFolder(folderData);
      setFolders(prev => [newFolder, ...prev]);
      return newFolder;
    } catch (error: any) {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create folder",
        variant: "destructive",
      });
      throw error;
    }
  };

  if (isLoading || isLoading1) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading JurisThis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background" data-testid="app-layout">
      {/* Left Sidebar */}
      <Sidebar
        folders={folders}
        chats={chats}
        activeFolder={activeFolder}
        activeChat={activeChat}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onSelectFolder={handleSelectFolder}
        onCreateFolder={handleCreateFolder}
        onOpenDraftGenerator={() => setShowDraftGenerator(true)}
        onOpenIPCBNSConverter={() => setShowIPCBNSConverter(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col bg-background overflow-hidden">
        <ChatArea
          activeChat={activeChat}
          activeFolder={activeFolder}
          onChatUpdate={(updatedChat) => {
            setChats(prev => prev.map(c => c.id === updatedChat.id ? updatedChat : c));
            setActiveChat(updatedChat);
          }}
          onToggleRightPanel={() => setShowRightPanel(!showRightPanel)}
        />
      </main>

      {/* Right Context Panel */}
      {showRightPanel && (
        <RightPanel
          activeFolder={activeFolder}
          onClose={() => setShowRightPanel(false)}
          onOpenIPCBNSConverter={() => setShowIPCBNSConverter(true)}
        />
      )}

      {/* Draft Generator Modal */}
      {showDraftGenerator && (
        <DraftGenerator
          folderId={activeFolder?.id}
          onClose={() => setShowDraftGenerator(false)}
          onDraftGenerated={(draft) => {
            setShowDraftGenerator(false);
            toast({
              title: "Draft Generated",
              description: "Your legal draft has been generated successfully.",
            });
          }}
        />
      )}

      {/* IPC BNS Converter Modal */}
      {showIPCBNSConverter && (
        <IPCBNSConverter
          open={showIPCBNSConverter}
          onClose={() => setShowIPCBNSConverter(false)}
        />
      )}
    </div>
  );
}
