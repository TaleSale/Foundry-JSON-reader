
import React, { useMemo, useRef, useEffect, useState } from 'react';
import { processFoundryTags } from '../utils/foundryParser';

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
  name: string;
  pages: JournalPage[];
  flags?: Record<string, any>; // For theme detection
}

interface FoundryJournalViewerProps {
  data: any; // Using any as the full journal structure is complex
  onOpenActorByName: (actorName: string) => void;
  onOpenItemByName: (itemName: string) => void;
  localizationData: Record<string, any> | null;
}

const FoundryJournalViewer: React.FC<FoundryJournalViewerProps> = ({ data, onOpenActorByName, onOpenItemByName, localizationData }) => {
  const journalData = data as JournalData;
  const [activePageIndex, setActivePageIndex] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // When the journal data changes (i.e., user switches tabs), reset to the first page.
  useEffect(() => {
    setActivePageIndex(0);
  }, [data]);

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
            const pageId = link.dataset.pageId;
            const actorName = link.dataset.actorName;
            const itemName = link.dataset.itemName;
            
            if (pageId) {
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
  }, [journalData.pages, setActivePageIndex, onOpenActorByName, onOpenItemByName]);


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


  const processedContent = useMemo(() => processFoundryTags(activePage.text?.content || '', journalData.pages.map(p => p._id), localizationData), [activePage, journalData.pages, localizationData]);

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
    <div className="journal-sheet flex flex-col h-full">
      <div className="journal-entry-content flex flex-grow overflow-hidden">
        <aside className="journal-sidebar w-48 p-2 overflow-y-auto flex-shrink-0">
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
        </aside>

        <article ref={contentRef} className="journal-entry-page flex-1 overflow-y-auto p-6">
            {renderPageContent()}
        </article>
      </div>
    </div>
  );
};

export default FoundryJournalViewer;
