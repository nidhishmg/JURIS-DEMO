import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Folder, Document } from '@/types';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import {
  FolderIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  ShareIcon,
  FileTextIcon,
  CalendarIcon,
  UserIcon,
  MoreHorizontalIcon,
  SearchIcon,
  FilterIcon,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface FolderManagerProps {
  folders: Folder[];
  onFolderSelect: (folder: Folder) => void;
  onFolderCreate: (folderData: any) => Promise<Folder>;
  onFolderUpdate: (folderId: string, updates: Partial<Folder>) => Promise<void>;
  onFolderDelete: (folderId: string) => Promise<void>;
}

export default function FolderManager({
  folders,
  onFolderSelect,
  onFolderCreate,
  onFolderUpdate,
  onFolderDelete,
}: FolderManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [folderForm, setFolderForm] = useState({
    name: '',
    description: '',
    privacy: 'private',
    jurisdiction: '',
    metadata: {},
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const filteredFolders = folders.filter(folder => {
    const matchesSearch = folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         folder.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterCategory === 'all' || 
                         (filterCategory === 'private' && folder.privacy === 'private') ||
                         (filterCategory === 'firm' && folder.privacy === 'firm') ||
                         (filterCategory === 'recent' && 
                          new Date(folder.updatedAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000);

    return matchesSearch && matchesFilter;
  });

  const handleCreateFolder = async () => {
    if (!folderForm.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Folder name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      await onFolderCreate(folderForm);
      setShowCreateDialog(false);
      setFolderForm({
        name: '',
        description: '',
        privacy: 'private',
        jurisdiction: '',
        metadata: {},
      });
      toast({
        title: "Success",
        description: "Case folder created successfully",
      });
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditFolder = async () => {
    if (!selectedFolder || !folderForm.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Folder name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      await onFolderUpdate(selectedFolder.id, folderForm);
      setShowEditDialog(false);
      setSelectedFolder(null);
      setFolderForm({
        name: '',
        description: '',
        privacy: 'private',
        jurisdiction: '',
        metadata: {},
      });
      toast({
        title: "Success",
        description: "Folder updated successfully",
      });
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
        description: "Failed to update folder",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFolder = async (folder: Folder) => {
    if (!confirm(`Are you sure you want to delete "${folder.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsLoading(true);
      await onFolderDelete(folder.id);
      toast({
        title: "Success",
        description: "Folder deleted successfully",
      });
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
        description: "Failed to delete folder",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (folder: Folder) => {
    setSelectedFolder(folder);
    setFolderForm({
      name: folder.name,
      description: folder.description || '',
      privacy: folder.privacy,
      jurisdiction: folder.jurisdiction || '',
      metadata: folder.metadata || {},
    });
    setShowEditDialog(true);
  };

  const getPrivacyBadgeColor = (privacy: string) => {
    switch (privacy) {
      case 'private':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'firm':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'public':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="p-6" data-testid="folder-manager">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Case Folders</h1>
          <p className="text-muted-foreground mt-1">
            Organize your legal work into dedicated case workspaces
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          data-testid="button-create-folder"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          New Case Folder
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-folders"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48" data-testid="select-filter">
            <FilterIcon className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Folders</SelectItem>
            <SelectItem value="recent">Recent</SelectItem>
            <SelectItem value="private">Private</SelectItem>
            <SelectItem value="firm">Firm</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Folders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFolders.map((folder) => (
          <Card
            key={folder.id}
            className="hover:shadow-lg transition-all duration-200 cursor-pointer"
            onClick={() => onFolderSelect(folder)}
            data-testid={`folder-card-${folder.id}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <FolderIcon className="w-6 h-6 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-semibold truncate">
                      {folder.name}
                    </CardTitle>
                    {folder.jurisdiction && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {folder.jurisdiction}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditDialog(folder);
                    }}
                    data-testid={`button-edit-${folder.id}`}
                  >
                    <EditIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFolder(folder);
                    }}
                    data-testid={`button-delete-${folder.id}`}
                  >
                    <TrashIcon className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {folder.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {folder.description}
                </p>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-xs ${getPrivacyBadgeColor(folder.privacy)}`}
                  >
                    {folder.privacy === 'private' ? (
                      <UserIcon className="w-3 h-3 mr-1" />
                    ) : (
                      <ShareIcon className="w-3 h-3 mr-1" />
                    )}
                    {folder.privacy}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarIcon className="w-3 h-3" />
                  <span>
                    {formatDistanceToNow(new Date(folder.updatedAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredFolders.length === 0 && (
        <div className="text-center py-12">
          <FolderIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {searchQuery || filterCategory !== 'all' ? 'No folders found' : 'No case folders yet'}
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            {searchQuery || filterCategory !== 'all'
              ? 'Try adjusting your search or filter criteria'
              : 'Create your first case folder to organize legal documents, chats, and drafts for a specific matter'}
          </p>
          {!searchQuery && filterCategory === 'all' && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Create First Folder
            </Button>
          )}
        </div>
      )}

      {/* Create Folder Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent data-testid="dialog-create-folder">
          <DialogHeader>
            <DialogTitle>Create New Case Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder Name *</Label>
              <Input
                id="folder-name"
                placeholder="e.g., State v. Kumar Bail Application"
                value={folderForm.name}
                onChange={(e) => setFolderForm(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-create-folder-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="folder-description">Description</Label>
              <Textarea
                id="folder-description"
                placeholder="Brief description of the case or legal matter"
                value={folderForm.description}
                onChange={(e) => setFolderForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                data-testid="textarea-create-folder-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="folder-jurisdiction">Jurisdiction</Label>
              <Input
                id="folder-jurisdiction"
                placeholder="e.g., Delhi High Court, Supreme Court"
                value={folderForm.jurisdiction}
                onChange={(e) => setFolderForm(prev => ({ ...prev, jurisdiction: e.target.value }))}
                data-testid="input-create-folder-jurisdiction"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="folder-privacy">Privacy Setting</Label>
              <Select value={folderForm.privacy} onValueChange={(value) => setFolderForm(prev => ({ ...prev, privacy: value }))}>
                <SelectTrigger data-testid="select-create-folder-privacy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private (Only you)</SelectItem>
                  <SelectItem value="firm">Firm (Organization members)</SelectItem>
                  <SelectItem value="public">Public (Read-only sharing)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                data-testid="button-cancel-create"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateFolder}
                disabled={!folderForm.name.trim() || isLoading}
                data-testid="button-confirm-create"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Create Folder
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Folder Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent data-testid="dialog-edit-folder">
          <DialogHeader>
            <DialogTitle>Edit Case Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-folder-name">Folder Name *</Label>
              <Input
                id="edit-folder-name"
                placeholder="e.g., State v. Kumar Bail Application"
                value={folderForm.name}
                onChange={(e) => setFolderForm(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-edit-folder-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-folder-description">Description</Label>
              <Textarea
                id="edit-folder-description"
                placeholder="Brief description of the case or legal matter"
                value={folderForm.description}
                onChange={(e) => setFolderForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                data-testid="textarea-edit-folder-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-folder-jurisdiction">Jurisdiction</Label>
              <Input
                id="edit-folder-jurisdiction"
                placeholder="e.g., Delhi High Court, Supreme Court"
                value={folderForm.jurisdiction}
                onChange={(e) => setFolderForm(prev => ({ ...prev, jurisdiction: e.target.value }))}
                data-testid="input-edit-folder-jurisdiction"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-folder-privacy">Privacy Setting</Label>
              <Select value={folderForm.privacy} onValueChange={(value) => setFolderForm(prev => ({ ...prev, privacy: value }))}>
                <SelectTrigger data-testid="select-edit-folder-privacy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private (Only you)</SelectItem>
                  <SelectItem value="firm">Firm (Organization members)</SelectItem>
                  <SelectItem value="public">Public (Read-only sharing)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditFolder}
                disabled={!folderForm.name.trim() || isLoading}
                data-testid="button-confirm-edit"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <EditIcon className="w-4 h-4 mr-2" />
                    Update Folder
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
