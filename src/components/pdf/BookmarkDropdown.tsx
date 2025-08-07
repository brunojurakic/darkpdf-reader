import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Bookmark as BookmarkIcon, BookmarkPlus, X, Edit2, Save } from "lucide-react";
import { Bookmark, addBookmark, removeBookmark, getBookmarksForPdf, isPageBookmarked } from "@/lib/bookmarks";

interface BookmarkDropdownProps {
  pdfHash: string;
  currentPage: number;
  onGoToPage: (page: number) => void;
}

const BookmarkDropdown: React.FC<BookmarkDropdownProps> = ({
  pdfHash,
  currentPage,
  onGoToPage,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [editingBookmark, setEditingBookmark] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const currentPageBookmarked = isPageBookmarked(pdfHash, currentPage);

  useEffect(() => {
    const loadBookmarks = () => {
      const pdfBookmarks = getBookmarksForPdf(pdfHash);
      setBookmarks(pdfBookmarks);
    };
    
    if (pdfHash) {
      loadBookmarks();
    }
  }, [pdfHash]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setEditingBookmark(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (editingBookmark && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingBookmark]);

  const handleAddBookmark = () => {
    const newBookmark = addBookmark(pdfHash, currentPage);
    setBookmarks(prev => [...prev, newBookmark].sort((a, b) => a.page - b.page));
  };

  const handleRemoveBookmark = (bookmarkId: string) => {
    removeBookmark(pdfHash, bookmarkId);
    setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
  };

  const handleGoToBookmark = (page: number) => {
    onGoToPage(page);
    setIsOpen(false);
  };

  const handleEditBookmark = (bookmark: Bookmark) => {
    setEditingBookmark(bookmark.id);
    setEditTitle(bookmark.title);
  };

  const handleSaveEdit = (bookmarkId: string) => {
    if (editTitle.trim()) {
      const updatedBookmarks = bookmarks.map(b => 
        b.id === bookmarkId ? { ...b, title: editTitle.trim() } : b
      );
      setBookmarks(updatedBookmarks);
      
      const bookmark = updatedBookmarks.find(b => b.id === bookmarkId);
      if (bookmark) {
        removeBookmark(pdfHash, bookmarkId);
        addBookmark(pdfHash, bookmark.page, editTitle.trim());
        const refreshedBookmarks = getBookmarksForPdf(pdfHash);
        setBookmarks(refreshedBookmarks);
      }
    }
    setEditingBookmark(null);
    setEditTitle('');
  };

  const handleCancelEdit = () => {
    setEditingBookmark(null);
    setEditTitle('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, bookmarkId: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(bookmarkId);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={`cursor-pointer ${currentPageBookmarked ? 'text-yellow-600 border-yellow-300' : ''}`}
        title={currentPageBookmarked ? "View bookmarks (current page bookmarked)" : "View bookmarks"}
      >
        <BookmarkIcon className={`h-4 w-4 ${currentPageBookmarked ? 'fill-current' : ''}`} />
      </Button>
      
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-popover border rounded-md shadow-lg z-50 max-h-96 overflow-hidden flex flex-col">
          <div className="p-3 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">Bookmarks</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddBookmark}
                className="text-xs h-7 px-2 cursor-pointer hover:bg-white"
                title={currentPageBookmarked ? "Already bookmarked" : `Add bookmark for page ${currentPage}`}
                disabled={currentPageBookmarked}
              >
                <BookmarkPlus className="h-3 w-3 mr-1" />
                {currentPageBookmarked ? 'Bookmarked' : 'Add'}
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {bookmarks.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No bookmarks yet.<br />
                Click "Add" to bookmark the current page.
              </div>
            ) : (
              <div className="py-2">
                {bookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 group"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      {editingBookmark === bookmark.id ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => handleEditKeyDown(e, bookmark.id)}
                          className="w-full px-2 py-1 text-sm border rounded bg-background"
                          placeholder="Bookmark title"
                        />
                      ) : (
                        <div
                          className="cursor-pointer text-sm hover:text-primary transition-colors"
                          onClick={() => handleGoToBookmark(bookmark.page)}
                          title={`Go to page ${bookmark.page}`}
                        >
                          <div className="font-medium truncate">{bookmark.title}</div>
                          <div className="text-xs text-muted-foreground">
                            Page {bookmark.page}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {editingBookmark === bookmark.id ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSaveEdit(bookmark.id)}
                            className="h-7 w-7 p-0 cursor-pointer"
                            title="Save bookmark title"
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEdit}
                            className="h-7 w-7 p-0 cursor-pointer"
                            title="Cancel editing"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditBookmark(bookmark)}
                            className="h-7 w-7 p-0 cursor-pointer"
                            title="Edit bookmark title"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveBookmark(bookmark.id)}
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-600 cursor-pointer"
                            title="Remove bookmark"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BookmarkDropdown;
