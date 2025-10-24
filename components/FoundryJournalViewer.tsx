

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { processFoundryTags } from '../utils/foundryParser';
import { Journal } from '../services/geminiService';

// A simplified interface for a Foundry journal page
interface JournalPage {
  name: string;
  type: string; // 'text', 'image', 'video', etc.
  text?: {
    content?: string;
    format?: number; // 1 is HTML
  };
  _id: string;
  title?: {
    show?: boolean;
    level?: number; // Heading level 1-6
  };
}

// A simplified interface for a Foundry journal
interface JournalData {
  _id: string;
  name: string;
  pages: JournalPage[];
  flags?: Record<string, any>; // For theme detection
}

interface FoundryJournalViewerProps {
  data: any; // Using any as the full journal structure is complex
  onOpenActorByName: (actorName: string) => void;
  onOpenItemByName: (itemName: string) => void;
  onOpenJournalAndPage: (journalFoundryId: string, pageFoundryId: string) => void;
  localizationData: Record<string, any> | null;
  journals: Journal[];
  initialPageId?: string;
}

const FoundryJournalViewer: React.FC<FoundryJournalViewerProps> = ({ data, onOpenActorByName, onOpenItemByName, onOpenJournalAndPage, localizationData, journals, initialPageId }) => {
  const journalData = data as JournalData;
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // When the journal data changes or an initial page is specified, set the active page.
  useEffect(() => {
    if (initialPageId) {
        const pageIndex = journalData.pages.findIndex(p => p._id === initialPageId);
        if (pageIndex !== -1) {
            setActivePageIndex(pageIndex);
            return;
        }
    }
    setActivePageIndex(0);
  }, [data, initialPageId, journalData.pages]);

  useEffect(() => {
    // Scroll to top of content when page changes
    if (contentRef.current) {
        contentRef.current.scrollTop = 0;
    }
  }, [activePageIndex, data]);

  // Effect to handle clicks on internal journal links
  useEffect(() => {
    const handleContentClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        const link = target.closest<HTMLAnchorElement>('a.internal-journal-link');

        if (link) {
            event.preventDefault();
            const journalFoundryId = link.dataset.journalFoundryId;
            const pageFoundryId = link.dataset.pageFoundryId;
            const pageId = link.dataset.pageId;
            const actorName = link.dataset.actorName;
            const itemName = link.dataset.itemName;
            
            if (journalFoundryId && pageFoundryId) {
                onOpenJournalAndPage(journalFoundryId, pageFoundryId);
            } else if (pageId) {
                const pageIndex = journalData.pages.findIndex(p => p._id === pageId);
                if (pageIndex !== -1) {
                    setActivePageIndex(pageIndex);
                }
            } else if (actorName) {
                onOpenActorByName(actorName);
            } else if (itemName) {
                onOpenItemByName(itemName);
            }
        }
    };

    const contentElement = contentRef.current;
    if (contentElement) {
        contentElement.addEventListener('click', handleContentClick);
    }

    return () => {
        if (contentElement) {
            contentElement.removeEventListener('click', handleContentClick);
        }
    };
  }, [journalData.pages, setActivePageIndex, onOpenActorByName, onOpenItemByName, onOpenJournalAndPage]);


  if (!journalData || !Array.isArray(journalData.pages) || journalData.pages.length === 0) {
    return (
      <div className="journal-sheet flex flex-col h-full items-center justify-center p-4">
            <p>This journal has no pages or is not in a recognized format.</p>
      </div>
    );
  }
  
  const activePage = journalData.pages[activePageIndex];
  if (!activePage) {
      // This can happen briefly when switching journals, so handle gracefully.
      return null;
  }


  const processedContent = useMemo(() => processFoundryTags(activePage.text?.content || '', { pages: journalData.pages, journals, currentJournalId: journalData._id }, localizationData), [activePage, journalData, journals, localizationData]);

  const renderPageContent = () => {
    if (activePage.type === 'text' && activePage.text?.content) {
      return (
         <div 
          className="journal-page-content"
          dangerouslySetInnerHTML={{ __html: processedContent }}
        />
      );
    }
    return <p className="text-gray-500">Unsupported page type: '{activePage.type}' or page has no content.</p>;
  }

  return (
    <div className="journal-sheet flex flex-col h-full relative">
      <button 
          onClick={() => setIsSidebarVisible(!isSidebarVisible)}
          className="absolute top-2 left-2 z-10 p-2 rounded-full text-white bg-black/30 hover:bg-black/50 transition-all opacity-50 hover:opacity-100"
          title={isSidebarVisible ? "Скрыть навигацию" : "Показать навигацию"}
      >
          {isSidebarVisible ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          )}
      </button>
      <div className="journal-entry-content flex flex-grow overflow-hidden">
        <aside className={`journal-sidebar transition-all duration-300 overflow-hidden ${isSidebarVisible ? 'w-48 p-2' : 'w-0 p-0'} flex-shrink-0`}>
          <div className={`${isSidebarVisible ? 'block overflow-y-auto h-full' : 'hidden'}`}>
            <nav>
              <ul>
                {journalData.pages.map((page, index) => {
                  // Default to level 1 if not specified. Level 1 has no extra indent.
                  const level = page.title?.level || 1;
                  // 1rem of indentation for each level beyond the first.
                  const indentation = (level - 1) * 1; // in rem
                  // Base horizontal padding is 0.5rem (like px-2).
                  const style = { 
                    paddingLeft: `${0.5 + indentation}rem`,
                    paddingRight: '0.5rem'
                  };

                  return (
                    <li key={page._id || index}>
                      <button 
                        onClick={() => setActivePageIndex(index)}
                        style={style}
                        className={`journal-page-link w-full text-left py-1.5 rounded-sm text-sm ${activePageIndex === index ? 'active' : ''}`}
                      >
                        {page.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </aside>

        <article ref={contentRef} className="journal-entry-page flex-1 overflow-y-auto p-6">
            {renderPageContent()}
        </article>
      </div>
    </div>
  );
};

export default FoundryJournalViewer;
