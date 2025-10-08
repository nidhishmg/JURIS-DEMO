import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Folder, Chat } from '@/types';
import { 
  FolderIcon, 
  PlusIcon, 
  MessageSquareIcon, 
  SearchIcon,
  FileTextIcon,
  Scale,
  RefreshCcwIcon,
  BookOpenIcon,
  CheckCircleIcon,
  SettingsIcon,
  HelpCircleIcon,
  LogOutIcon
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SidebarProps {
  folders: Folder[];
  chats: Chat[];
  activeFolder: Folder | null;
  activeChat: Chat | null;
  onNewChat: (folderId?: string, mode?: string) => void;
  onSelectChat: (chat: Chat) => void;
  onSelectFolder: (folder: Folder) => void;
  onCreateFolder: (folderData: any) => Promise<Folder>;
  onOpenDraftGenerator: () => void;
}

export default function Sidebar({ 
  folders, 
  chats, 
  activeFolder, 
  activeChat, 
  onNewChat, 
  onSelectChat, 
  onSelectFolder, 
  onCreateFolder,
  onOpenDraftGenerator 
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderData, setNewFolderData] = useState({
    name: '',
    description: '',
    privacy: 'private',
    jurisdiction: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateFolder = async () => {
    if (!newFolderData.name.trim()) return;
    
    setIsCreating(true);
    try {
      await onCreateFolder(newFolderData);
      setShowNewFolderDialog(false);
      setNewFolderData({ name: '', description: '', privacy: 'private', jurisdiction: '' });
    } catch (error) {
      // Error handled in parent component
    } finally {
      setIsCreating(false);
    }
  };

  const filteredChats = chats.filter(chat => 
    chat.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const recentChats = chats.filter(chat => !chat.folderId).slice(0, 10);

  return (
    <aside className="w-72 bg-card border-r border-border flex flex-col" data-testid="sidebar">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Scale className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-lg text-foreground">JurisThis</h1>
            <p className="text-xs text-muted-foreground">AI Legal Assistant</p>
          </div>
        </div>
        
        {/* New Chat Button */}
        <Button 
          className="w-full" 
          onClick={() => onNewChat()}
          data-testid="button-new-chat"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-chats"
          />
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {/* Case Folders Section */}
        <div className="px-4 py-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Case Folders
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setShowNewFolderDialog(true)}
              data-testid="button-create-folder"
            >
              <PlusIcon className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="space-y-1">
            {folders.map((folder) => {
              const folderChats = chats.filter(c => c.folderId === folder.id);
              const isActive = activeFolder?.id === folder.id;
              
              return (
                <div
                  key={folder.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    isActive 
                      ? 'bg-accent/10 border border-accent/20' 
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => onSelectFolder(folder)}
                  data-testid={`folder-${folder.id}`}
                >
                  <FolderIcon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-accent' : 'text-muted-foreground'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isActive ? 'text-accent' : 'text-foreground'}`}>
                      {folder.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {folderChats.length} chats
                    </p>
                  </div>
                  {folderChats.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {folderChats.length}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Features Section */}
        <div className="px-4 py-2 mt-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Features
          </h3>
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={onOpenDraftGenerator}
              data-testid="button-draft-generator"
            >
              <FileTextIcon className="w-4 h-4 mr-2" />
              Draft Generator
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              <FileTextIcon className="w-4 h-4 mr-2" />
              Judgment Analysis
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              <RefreshCcwIcon className="w-4 h-4 mr-2" />
              IPC ↔ BNS Converter
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              <BookOpenIcon className="w-4 h-4 mr-2" />
              Bare Act Explorer
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              <CheckCircleIcon className="w-4 h-4 mr-2" />
              Citation Verifier
            </Button>
          </div>
        </div>

        {/* Previous Chats Section */}
        <div className="px-4 py-2 mt-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Previous Chats
          </h3>
          <div className="space-y-1">
            {(searchQuery ? filteredChats : recentChats).map((chat) => (
              <div
                key={chat.id}
                className={`flex items-start gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  activeChat?.id === chat.id 
                    ? 'bg-accent/10 border border-accent/20' 
                    : 'hover:bg-muted'
                }`}
                onClick={() => onSelectChat(chat)}
                data-testid={`chat-${chat.id}`}
              >
                <MessageSquareIcon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">
                    {chat.title || 'New Chat'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(chat.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-1">
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <SettingsIcon className="w-4 h-4 mr-2" />
          Settings
        </Button>
        
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <HelpCircleIcon className="w-4 h-4 mr-2" />
          Help & Support
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => window.location.href = '/api/logout'}
          data-testid="button-logout"
        >
          <LogOutIcon className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent data-testid="dialog-new-folder">
          <DialogHeader>
            <DialogTitle>Create New Case Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Folder Name *</label>
              <Input
                placeholder="e.g., State v. Kumar Bail Application"
                value={newFolderData.name}
                onChange={(e) => setNewFolderData(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-folder-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                placeholder="Brief description of the case"
                value={newFolderData.description}
                onChange={(e) => setNewFolderData(prev => ({ ...prev, description: e.target.value }))}
                data-testid="input-folder-description"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Jurisdiction</label>
              <Input
                placeholder="e.g., Delhi High Court"
                value={newFolderData.jurisdiction}
                onChange={(e) => setNewFolderData(prev => ({ ...prev, jurisdiction: e.target.value }))}
                data-testid="input-folder-jurisdiction"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateFolder} 
                disabled={!newFolderData.name.trim() || isCreating}
                data-testid="button-create-folder-submit"
              >
                {isCreating ? 'Creating...' : 'Create Folder'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
