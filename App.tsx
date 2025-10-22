
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Journal, Actor, Item } from './services/geminiService';
import FoundryJournalViewer from './components/FoundryJournalViewer';
import FoundryActorViewer from './components/FoundryActorViewer';
import FoundryItemViewer from './components/FoundryItemViewer';

interface Folder {
    id: string;
    name: string;
    itemIds: string[];
}

interface OpenTab {
    id:string;
    type: 'journal' | 'actor' | 'item';
}

interface WorldData {
    journals: Journal[];
    journalFolders: Folder[];
    actors: Actor[];
    actorFolders: Folder[];
    items: Item[];
    itemFolders: Folder[];
    localizationData?: Record<string, any> | null;
}

const App: React.FC = () => {
    const [journals, setJournals] = useState<Journal[]>([]);
    const [journalFolders, setJournalFolders] = useState<Folder[]>([]);
    const [actors, setActors] = useState<Actor[]>([]);
    const [actorFolders, setActorFolders] = useState<Folder[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [itemFolders, setItemFolders] = useState<Folder[]>([]);
    const [localizationData, setLocalizationData] = useState<Record<string, any> | null>(null);

    const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);

    const [activeRightTab, setActiveRightTab] = useState<'journals' | 'actors' | 'items' | 'worlds'>('journals');
    
    const [error, setError] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    
    // State for Journals
    const [isCreatingJournalFolder, setIsCreatingJournalFolder] = useState<boolean>(false);
    const [newJournalFolderName, setNewJournalFolderName] = useState<string>('');
    const [openJournalFolderIds, setOpenJournalFolderIds] = useState<Record<string, boolean>>({});
    const [draggedJournalId, setDraggedJournalId] = useState<string | null>(null);
    const [journalDropTargetId, setJournalDropTargetId] = useState<string | null>(null);

    // State for Actors
    const [isCreatingActorFolder, setIsCreatingActorFolder] = useState<boolean>(false);
    const [newActorFolderName, setNewActorFolderName] = useState<string>('');
    const [openActorFolderIds, setOpenActorFolderIds] = useState<Record<string, boolean>>({});
    const [draggedActorId, setDraggedActorId] = useState<string | null>(null);
    const [actorDropTargetId, setActorDropTargetId] = useState<string | null>(null);
    
    // State for Items
    const [isCreatingItemFolder, setIsCreatingItemFolder] = useState<boolean>(false);
    const [newItemFolderName, setNewItemFolderName] = useState<string>('');
    const [openItemFolderIds, setOpenItemFolderIds] = useState<Record<string, boolean>>({});
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
    const [itemDropTargetId, setItemDropTargetId] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const worldInputRef = useRef<HTMLInputElement>(null);
    const localizationInputRef = useRef<HTMLInputElement>(null);
    const newJournalFolderInputRef = useRef<HTMLInputElement>(null);
    const newActorFolderInputRef = useRef<HTMLInputElement>(null);
    const newItemFolderInputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
      // Load default localization on startup
      fetch('./locales/ru.json')
        .then(res => res.json())
        .then(data => setLocalizationData(data))
        .catch(err => console.error("Failed to load default localization:", err));
    }, []);

    useEffect(() => {
      if (isCreatingJournalFolder) newJournalFolderInputRef.current?.focus();
    }, [isCreatingJournalFolder]);
    
    useEffect(() => {
      if (isCreatingActorFolder) newActorFolderInputRef.current?.focus();
    }, [isCreatingActorFolder]);
    
    useEffect(() => {
      if (isCreatingItemFolder) newItemFolderInputRef.current?.focus();
    }, [isCreatingItemFolder]);

    const activeTab = useMemo(() => {
        if (!activeTabId) return null;
        return openTabs.find(t => t.id === activeTabId) || null;
    }, [openTabs, activeTabId]);

    const activeItem = useMemo(() => {
        if (!activeTab) return null;
        if (activeTab.type === 'journal') return journals.find(j => j.id === activeTab.id) || null;
        if (activeTab.type === 'actor') return actors.find(a => a.id === activeTab.id) || null;
        if (activeTab.type === 'item') return items.find(i => i.id === activeTab.id) || null;
        return null;
    }, [activeTab, journals, actors, items]);
    
    const filedJournalIds = useMemo(() => new Set(journalFolders.flatMap(f => f.itemIds)), [journalFolders]);
    const unfiledJournals = useMemo(() => journals.filter(j => !filedJournalIds.has(j.id)), [journals, filedJournalIds]);
    
    const filedActorIds = useMemo(() => new Set(actorFolders.flatMap(f => f.itemIds)), [actorFolders]);
    const unfiledActors = useMemo(() => actors.filter(a => !filedActorIds.has(a.id)), [actors, filedActorIds]);
    
    const filedItemIds = useMemo(() => new Set(itemFolders.flatMap(f => f.itemIds)), [itemFolders]);
    const unfiledItems = useMemo(() => items.filter(i => !filedItemIds.has(i.id)), [items, filedItemIds]);

    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) {
            return { journals: [], actors: [], items: [] };
        }
        const lowerCaseQuery = searchQuery.toLowerCase();
        return {
            journals: journals.filter(j => j.name.toLowerCase().includes(lowerCaseQuery)),
            actors: actors.filter(a => a.name.toLowerCase().includes(lowerCaseQuery)),
            items: items.filter(i => i.name.toLowerCase().includes(lowerCaseQuery)),
        };
    }, [searchQuery, journals, actors, items]);


    const handleFileSelect = useCallback((file: File) => {
        setError('');
        if (file.type !== 'application/json') {
            setError('Invalid file type. Please upload a JSON file.');
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const data = JSON.parse(text);

                if (data.system && (data.type === 'npc' || data.type === 'character')) {
                    const newActor: Actor = {
                        id: crypto.randomUUID(),
                        name: data.name || file.name.replace('.json', ''),
                        data: data,
                    };
                    setActors(prev => [...prev, newActor]);
                    handleOpenItem(newActor.id, 'actor');
                } else if (data.pages && Array.isArray(data.pages)) {
                     const newJournal: Journal = {
                        id: crypto.randomUUID(),
                        name: data.name || file.name.replace('.json', ''),
                        data: data,
                    };
                    setJournals(prev => [...prev, newJournal]);
                    handleOpenItem(newJournal.id, 'journal');
                } else if (data.system && data.type) {
                     const newItem: Item = {
                        id: crypto.randomUUID(),
                        name: data.name || file.name.replace('.json', ''),
                        data: data,
                    };
                    setItems(prev => [...prev, newItem]);
                    handleOpenItem(newItem.id, 'item');
                } else {
                     setError('Unrecognized JSON format. Does not appear to be a Foundry Journal, Actor, or Item.');
                }
            } catch (err) {
                setError('Failed to parse JSON file.');
                console.error(err);
            }
        };
        reader.onerror = () => setError('Failed to read the file.');
        reader.readAsText(file);
    }, []);

    const handleOpenItem = useCallback((itemId: string, type: 'journal' | 'actor' | 'item') => {
        if (!openTabs.find(t => t.id === itemId)) {
            setOpenTabs(prev => [...prev, {id: itemId, type}]);
        }
        setActiveTabId(itemId);
    }, [openTabs]);

    const handleOpenActorByName = useCallback((actorName: string) => {
        const normalizedActorName = actorName.trim().toLowerCase();
        // Find actor where one of its names (split by " / ") matches the link text
        const foundActor = actors.find(actor => {
            const nameParts = actor.name.split(' / ').map(p => p.trim().toLowerCase());
            return nameParts.includes(normalizedActorName);
        });

        if (foundActor) {
            handleOpenItem(foundActor.id, 'actor');
        } else {
            // Silently fail if actor not found, or show a notification
            console.warn(`Actor "${actorName}" not found in the current world.`);
        }
    }, [actors, handleOpenItem]);
    
    const handleOpenItemByName = useCallback((itemName: string) => {
        const normalizedItemName = itemName.trim().toLowerCase();
        const foundItem = items.find(item => {
            const nameParts = item.name.split(' / ').map(p => p.trim().toLowerCase());
            return nameParts.includes(normalizedItemName) || item.name.trim().toLowerCase() === normalizedItemName;
        });

        if (foundItem) {
            handleOpenItem(foundItem.id, 'item');
        } else {
            console.warn(`Item "${itemName}" not found in the current world.`);
        }
    }, [items, handleOpenItem]);

    const handleCloseTab = useCallback((tabIdToClose: string) => {
        const newOpenTabs = openTabs.filter(t => t.id !== tabIdToClose);
        if (activeTabId === tabIdToClose) {
            const closingIndex = openTabs.findIndex(t => t.id === tabIdToClose);
            const newActiveTab = newOpenTabs.length > 0 ? (newOpenTabs[closingIndex] || newOpenTabs[closingIndex - 1] || newOpenTabs[0]) : null;
            setActiveTabId(newActiveTab ? newActiveTab.id : null);
        }
        setOpenTabs(newOpenTabs);
    }, [openTabs, activeTabId]);
    
    const handleCreateFolder = useCallback((type: 'journal' | 'actor' | 'item') => {
      const name = type === 'journal' ? newJournalFolderName : (type === 'actor' ? newActorFolderName : newItemFolderName);
      if (!name.trim()) {
        if (type === 'journal') { setIsCreatingJournalFolder(false); setNewJournalFolderName(''); }
        else if (type === 'actor') { setIsCreatingActorFolder(false); setNewActorFolderName(''); }
        else { setIsCreatingItemFolder(false); setNewItemFolderName(''); }
        return;
      }
      const newFolder: Folder = {
        id: crypto.randomUUID(),
        name: name.trim(),
        itemIds: [],
      };
      if (type === 'journal') {
        setJournalFolders(prev => [...prev, newFolder]);
        setOpenJournalFolderIds(prev => ({...prev, [newFolder.id]: true}));
        setNewJournalFolderName('');
        setIsCreatingJournalFolder(false);
      } else if (type === 'actor') {
        setActorFolders(prev => [...prev, newFolder]);
        setOpenActorFolderIds(prev => ({...prev, [newFolder.id]: true}));
        setNewActorFolderName('');
        setIsCreatingActorFolder(false);
      } else {
        setItemFolders(prev => [...prev, newFolder]);
        setOpenItemFolderIds(prev => ({...prev, [newFolder.id]: true}));
        setNewItemFolderName('');
        setIsCreatingItemFolder(false);
      }
    }, [newJournalFolderName, newActorFolderName, newItemFolderName]);

    const handleDeleteItem = (itemId: string, type: 'journal' | 'actor' | 'item') => {
        if (!window.confirm(`Are you sure you want to delete this ${type}? This cannot be undone.`)) return;
        
        if (type === 'journal') {
            setJournals(prev => prev.filter(j => j.id !== itemId));
            setJournalFolders(prev => prev.map(f => ({...f, itemIds: f.itemIds.filter(id => id !== itemId)})));
        } else if (type === 'actor') {
            setActors(prev => prev.filter(a => a.id !== itemId));
            setActorFolders(prev => prev.map(f => ({...f, itemIds: f.itemIds.filter(id => id !== itemId)})));
        } else {
            setItems(prev => prev.filter(i => i.id !== itemId));
            setItemFolders(prev => prev.map(f => ({...f, itemIds: f.itemIds.filter(id => id !== itemId)})));
        }
        handleCloseTab(itemId);
    };
    
    const handleDeleteFolder = (folderId: string, type: 'journal' | 'actor' | 'item') => {
        if (!window.confirm(`Are you sure you want to delete this folder? Items inside will become unfiled.`)) return;
        if (type === 'journal') {
            setJournalFolders(prev => prev.filter(f => f.id !== folderId));
        } else if (type === 'actor') {
            setActorFolders(prev => prev.filter(f => f.id !== folderId));
        } else {
            setItemFolders(prev => prev.filter(f => f.id !== folderId));
        }
    };
    
    const handleDrop = useCallback((targetFolderId: string | null, type: 'journal' | 'actor' | 'item') => {
        const draggedId = type === 'journal' ? draggedJournalId : (type === 'actor' ? draggedActorId : draggedItemId);
        if (!draggedId) return;

        const setFolders = type === 'journal' ? setJournalFolders : (type === 'actor' ? setActorFolders : setItemFolders);

        setFolders(currentFolders => {
            const newFolders = JSON.parse(JSON.stringify(currentFolders));
            
            const sourceFolder = newFolders.find((f: Folder) => f.itemIds.includes(draggedId));
            if (sourceFolder) {
                sourceFolder.itemIds = sourceFolder.itemIds.filter((id: string) => id !== draggedId);
            }

            if (targetFolderId) {
                const targetFolder = newFolders.find((f: Folder) => f.id === targetFolderId);
                if (targetFolder && !targetFolder.itemIds.includes(draggedId)) {
                    targetFolder.itemIds.push(draggedId);
                }
            }
            return newFolders;
        });
        
        if (type === 'journal') setJournalDropTargetId(null);
        else if (type === 'actor') setActorDropTargetId(null);
        else setItemDropTargetId(null);

    }, [draggedJournalId, draggedActorId, draggedItemId]);

    const handleSaveWorld = useCallback(() => {
        const worldData: WorldData = { journals, journalFolders, actors, actorFolders, items, itemFolders, localizationData };
        const blob = new Blob([JSON.stringify(worldData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'foundry-world.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [journals, journalFolders, actors, actorFolders, items, itemFolders, localizationData]);

    const handleLoadWorldFile = (file: File) => {
        if (file.type !== 'application/json') {
            alert('Invalid file type. Please upload a world JSON file.'); return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string) as WorldData;
                if (Array.isArray(data.journals) || Array.isArray(data.actors) || Array.isArray(data.items)) {
                    setJournals(data.journals || []);
                    setJournalFolders(data.journalFolders || []);
                    setActors(data.actors || []);
                    setActorFolders(data.actorFolders || []);
                    setItems(data.items || []);
                    setItemFolders(data.itemFolders || []);
                    setLocalizationData(data.localizationData || null);
                    
                    setOpenJournalFolderIds((data.journalFolders || []).reduce((acc, f) => ({...acc, [f.id]: true}), {}));
                    setOpenActorFolderIds((data.actorFolders || []).reduce((acc, f) => ({...acc, [f.id]: true}), {}));
                    setOpenItemFolderIds((data.itemFolders || []).reduce((acc, f) => ({...acc, [f.id]: true}), {}));
                    
                    setOpenTabs([]);
                    setActiveTabId(null);
                    setActiveRightTab('journals');
                } else { alert('Invalid world file format.'); }
            } catch (err) { alert('Failed to parse world file.'); }
        };
        reader.readAsText(file);
    };

    const handleLoadLocalizationFile = (file: File) => {
        if (file.type !== 'application/json') {
            alert('Invalid file type. Please upload a localization JSON file.'); return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                setLocalizationData(data);
            } catch (err) {
                alert('Failed to parse localization file.');
            }
        };
        reader.readAsText(file);
    };

    const RightTabButton: React.FC<{tabId: string, label: string}> = ({ tabId, label }) => (
        <button
            onClick={() => setActiveRightTab(tabId as any)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeRightTab === tabId
                    ? 'border-b-2 border-foundry-accent text-foundry-accent'
                    : 'border-b-2 border-transparent text-foundry-text-muted hover:text-foundry-text'
            }`}
        >
            {label}
        </button>
    );
    
    const renderItemList = (type: 'journal' | 'actor' | 'item') => {
      const listItems = type === 'journal' ? journals : type === 'actor' ? actors : items;
      const listFolders = type === 'journal' ? journalFolders : type === 'actor' ? actorFolders : itemFolders;
      const listUnfiledItems = type === 'journal' ? unfiledJournals : type === 'actor' ? unfiledActors : unfiledItems;
      const setDraggedId = type === 'journal' ? setDraggedJournalId : type === 'actor' ? setDraggedActorId : setDraggedItemId;
      const setDropTargetId = type === 'journal' ? setJournalDropTargetId : type === 'actor' ? setActorDropTargetId : setItemDropTargetId;
      const dropTargetId = type === 'journal' ? journalDropTargetId : type === 'actor' ? actorDropTargetId : itemDropTargetId;
      const draggedId = type === 'journal' ? draggedJournalId : type === 'actor' ? draggedActorId : draggedItemId;
      const handleDelete = handleDeleteItem;
      const openFolderIds = type === 'journal' ? openJournalFolderIds : type === 'actor' ? openActorFolderIds : openItemFolderIds;
      const setOpenFolderIds = type === 'journal' ? setOpenJournalFolderIds : type === 'actor' ? setOpenActorFolderIds : setOpenItemFolderIds;

      const ListItem: React.FC<{item: Journal | Actor | Item}> = ({ item }) => (
        <li 
          draggable
          onDragStart={(e) => { e.dataTransfer.setData('itemId', item.id); setDraggedId(item.id); }}
          onDragEnd={() => { setDraggedId(null); setDropTargetId(null); }}
          className={`group flex items-center justify-between w-full rounded-md transition-colors hover:bg-foundry-light ${draggedId === item.id ? 'opacity-50' : 'opacity-100'}`}
        >
          <button onClick={() => handleOpenItem(item.id, type)} className="flex-grow text-left p-2">
            {item.name}
          </button>
          <button onClick={() => handleDelete(item.id, type)} title={`Delete ${type}`}
              className="px-2 text-foundry-text-muted opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity">
              &times;
          </button>
        </li>
      );

      return (
          <>
          {listFolders.map(folder => (
            <details key={folder.id} open={openFolderIds[folder.id] ?? true} 
              onToggle={(e) => {
                const isOpen = (e.target as HTMLDetailsElement).open;
                setOpenFolderIds(p => ({...p, [folder.id]: isOpen}));
              }}
              className="mb-1"
            >
              <summary 
                className={`group flex items-center justify-between p-2 font-semibold text-foundry-text list-none cursor-pointer rounded-md transition-colors ${dropTargetId === folder.id ? 'bg-foundry-accent/30' : 'hover:bg-foundry-light/50'}`}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={(e) => { e.preventDefault(); draggedId && setDropTargetId(folder.id); }}
                onDrop={(e) => { e.stopPropagation(); handleDrop(folder.id, type); }}
              >
                <div className="flex-grow">
                    <span className="inline-block w-4">{(openFolderIds[folder.id] ?? true) ? '▼' : '▶'}</span>
                    {folder.name}
                </div>
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteFolder(folder.id, type); }} title="Delete folder"
                    className="px-2 text-foundry-text-muted opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity">
                    &times;
                </button>
              </summary>
              <ul className="pl-4 border-l-2 border-foundry-light ml-4">
                {folder.itemIds.map(itemId => {
                  const item = listItems.find(i => i.id === itemId);
                  return item ? <ListItem key={item.id} item={item} /> : null;
                })}
                {folder.itemIds.length === 0 && <li className="p-2 text-foundry-text-muted text-sm italic">Folder is empty</li>}
              </ul>
            </details>
          ))}
          <ul className={`py-1 rounded-md transition-colors ${dropTargetId === 'root' ? 'bg-foundry-accent/30' : ''}`}>
            {listUnfiledItems.map(item => <ListItem key={item.id} item={item} />)}
          </ul>
        </>
      );
    };

    return (
        <div className="min-h-screen bg-foundry-dark font-sans flex flex-col">
            <main className="flex-grow grid grid-cols-1 lg:grid-cols-5 gap-4 p-4 h-screen">
                <div className="lg:col-span-4 flex flex-col bg-foundry-mid rounded-lg border border-foundry-light overflow-hidden">
                    {openTabs.length > 0 ? (
                        <>
                            <div className="flex-shrink-0 bg-foundry-dark border-b border-foundry-light">
                                <nav className="flex space-x-1 p-1 overflow-x-auto">
                                    {openTabs.map(tab => {
                                        const item = tab.type === 'journal' ? journals.find(j => j.id === tab.id) : (tab.type === 'actor' ? actors.find(a => a.id === tab.id) : items.find(i => i.id === tab.id));
                                        return (
                                            <div key={tab.id} onClick={() => setActiveTabId(tab.id)}
                                                className={`flex items-center justify-between rounded-md text-sm cursor-pointer transition-colors flex-shrink-0 ${activeTabId === tab.id ? 'bg-foundry-accent text-foundry-dark font-semibold' : 'bg-foundry-light hover:bg-opacity-75 text-foundry-text'}`}>
                                              <span className="px-3 py-1.5 whitespace-nowrap">{item?.name || 'Untitled'}</span>
                                              <button onClick={(e) => { e.stopPropagation(); handleCloseTab(tab.id); }} 
                                                className={`px-2 py-1.5 rounded-r-md ${activeTabId === tab.id ? 'hover:bg-black/20' : 'hover:bg-foundry-dark'}`} title="Close tab">
                                                  &times;
                                              </button>
                                            </div>
                                        );
                                    })}
                                </nav>
                            </div>
                            {activeItem && activeTab?.type === 'journal' && <FoundryJournalViewer data={activeItem.data} onOpenActorByName={handleOpenActorByName} onOpenItemByName={handleOpenItemByName} localizationData={localizationData} />}
                            {activeItem && activeTab?.type === 'actor' && <FoundryActorViewer data={activeItem.data} onOpenActorByName={handleOpenActorByName} onOpenItemByName={handleOpenItemByName} localizationData={localizationData} />}
                            {activeItem && activeTab?.type === 'item' && <FoundryItemViewer data={activeItem.data} onOpenActorByName={handleOpenActorByName} onOpenItemByName={handleOpenItemByName} localizationData={localizationData} />}
                        </>
                    ) : (
                        <div className="flex flex-col h-full p-4 items-center justify-center text-center">
                           <p className="text-foundry-text-muted">No items are open.</p>
                           <p className="text-foundry-text-muted text-sm mt-1">Select a journal, actor, or item to view it.</p>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-1 flex flex-col bg-foundry-mid rounded-lg border border-foundry-light overflow-hidden">
                    <header className="bg-foundry-dark p-4 border-b border-foundry-light shadow-md text-center">
                        <h1 className="text-xl font-bold text-foundry-accent">Foundry VTT Viewer</h1>
                        <div className="relative mt-4">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Поиск..."
                                className="w-full bg-foundry-dark border border-foundry-light rounded-md p-2 pl-4 pr-8 text-sm focus:ring-1 focus:ring-foundry-accent focus:outline-none"
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-foundry-text-muted hover:text-foundry-text text-xl"
                                    aria-label="Clear search"
                                >
                                    &times;
                                </button>
                            )}
                        </div>
                    </header>

                    <div className="flex-grow overflow-hidden">
                        {searchQuery.trim() ? (
                            <div className="p-4 overflow-y-auto h-full">
                                {(searchResults.journals.length === 0 && searchResults.actors.length === 0 && searchResults.items.length === 0) ? (
                                    <p className="text-foundry-text-muted text-center pt-8">Ничего не найдено.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {searchResults.journals.length > 0 && (
                                            <div>
                                                <h3 className="text-sm font-semibold text-foundry-text-muted uppercase tracking-wider mb-2">Журналы</h3>
                                                <ul>
                                                    {searchResults.journals.map(j => (
                                                        <li key={j.id}>
                                                            <button onClick={() => { handleOpenItem(j.id, 'journal'); setSearchQuery(''); }} className="w-full text-left p-2 rounded-md hover:bg-foundry-light transition-colors">
                                                                {j.name}
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {searchResults.actors.length > 0 && (
                                            <div>
                                                <h3 className="text-sm font-semibold text-foundry-text-muted uppercase tracking-wider mb-2">Актеры</h3>
                                                <ul>
                                                    {searchResults.actors.map(a => (
                                                        <li key={a.id}>
                                                            <button onClick={() => { handleOpenItem(a.id, 'actor'); setSearchQuery(''); }} className="w-full text-left p-2 rounded-md hover:bg-foundry-light transition-colors">
                                                                {a.name}
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {searchResults.items.length > 0 && (
                                            <div>
                                                <h3 className="text-sm font-semibold text-foundry-text-muted uppercase tracking-wider mb-2">Предметы</h3>
                                                <ul>
                                                    {searchResults.items.map(i => (
                                                        <li key={i.id}>
                                                            <button onClick={() => { handleOpenItem(i.id, 'item'); setSearchQuery(''); }} className="w-full text-left p-2 rounded-md hover:bg-foundry-light transition-colors">
                                                                {i.name}
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="flex-shrink-0 border-b border-foundry-light">
                                    <nav className="flex justify-around">
                                       <RightTabButton tabId="journals" label="Журналы" />
                                       <RightTabButton tabId="actors" label="Актеры" />
                                       <RightTabButton tabId="items" label="Предметы" />
                                       <RightTabButton tabId="worlds" label="Миры" />
                                    </nav>
                                </div>
                                <div className="flex-grow overflow-hidden">
                                    {['journals', 'actors', 'items'].includes(activeRightTab) && (
                                       <div className="p-4 flex flex-col h-full">
                                            {activeRightTab === 'journals' && (
                                                <div className="space-x-2 mb-4">
                                                    <button onClick={() => setIsCreatingJournalFolder(true)} className="px-3 py-1.5 bg-foundry-light text-foundry-text-muted rounded-md text-sm hover:bg-foundry-accent hover:text-white transition-colors">Создать папку</button>
                                                    <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-foundry-accent text-white rounded-md text-sm hover:bg-orange-500 transition-colors">Создать журнал</button>
                                                </div>
                                            )}
                                            {activeRightTab === 'actors' && (
                                                <div className="space-x-2 mb-4">
                                                    <button onClick={() => setIsCreatingActorFolder(true)} className="px-3 py-1.5 bg-foundry-light text-foundry-text-muted rounded-md text-sm hover:bg-foundry-accent hover:text-white transition-colors">Создать папку</button>
                                                    <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-foundry-accent text-white rounded-md text-sm hover:bg-orange-500 transition-colors">Создать актера</button>
                                                </div>
                                            )}
                                            {activeRightTab === 'items' && (
                                                <div className="space-x-2 mb-4">
                                                    <button onClick={() => setIsCreatingItemFolder(true)} className="px-3 py-1.5 bg-foundry-light text-foundry-text-muted rounded-md text-sm hover:bg-foundry-accent hover:text-white transition-colors">Создать папку</button>
                                                    <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-foundry-accent text-white rounded-md text-sm hover:bg-orange-500 transition-colors">Создать предмет</button>
                                                </div>
                                            )}
                                            <input type="file" ref={fileInputRef} accept=".json" className="hidden" onChange={(e) => { if(e.target.files) handleFileSelect(e.target.files[0]); e.target.value = ''; }} />

                                            <div className="flex-grow overflow-y-auto border-t border-foundry-light pt-2"
                                              onDragOver={(e) => e.preventDefault()}
                                              onDragEnter={() => {
                                                  if (activeRightTab === 'journals' && draggedJournalId) setJournalDropTargetId('root');
                                                  else if (activeRightTab === 'actors' && draggedActorId) setActorDropTargetId('root');
                                                  else if (activeRightTab === 'items' && draggedItemId) setItemDropTargetId('root');
                                              }}
                                              onDrop={() => { handleDrop(null, activeRightTab.slice(0, -1) as 'journal' | 'actor' | 'item'); }}>
                                              
                                              {error && <div className="mb-2 text-red-400 bg-red-900/50 p-2 rounded-md text-sm">{error}</div>}
                                              
                                              {(activeRightTab === 'journals' ? isCreatingJournalFolder : (activeRightTab === 'actors' ? isCreatingActorFolder : isCreatingItemFolder)) && (
                                                <div className="p-2 mb-2">
                                                  <input 
                                                    ref={activeRightTab === 'journals' ? newJournalFolderInputRef : (activeRightTab === 'actors' ? newActorFolderInputRef : newItemFolderInputRef)} 
                                                    type="text"
                                                    value={activeRightTab === 'journals' ? newJournalFolderName : (activeRightTab === 'actors' ? newActorFolderName : newItemFolderName)}
                                                    onChange={(e) => {
                                                        if (activeRightTab === 'journals') setNewJournalFolderName(e.target.value);
                                                        else if (activeRightTab === 'actors') setNewActorFolderName(e.target.value);
                                                        else setNewItemFolderName(e.target.value);
                                                    }}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder(activeRightTab.slice(0, -1) as 'journal'|'actor'|'item')}
                                                    onBlur={() => handleCreateFolder(activeRightTab.slice(0, -1) as 'journal'|'actor'|'item')}
                                                    placeholder="Folder name..."
                                                    className="w-full bg-foundry-dark border border-foundry-light rounded-md p-1.5 text-sm focus:ring-1 focus:ring-foundry-accent focus:outline-none"/>
                                                </div>
                                              )}
                                              
                                              {renderItemList(activeRightTab.slice(0, -1) as 'journal' | 'actor' | 'item')}

                                              {(activeRightTab === 'journals' ? journals : (activeRightTab === 'actors' ? actors : items)).length === 0 && !(activeRightTab === 'journals' ? isCreatingJournalFolder : (activeRightTab === 'actors' ? isCreatingActorFolder : isCreatingItemFolder)) && (
                                                <p className="text-foundry-text-muted text-sm text-center pt-8">No {activeRightTab} loaded.</p>
                                              )}
                                            </div>
                                       </div>
                                    )}

                                    {activeRightTab === 'worlds' && (
                                       <div className="p-4 space-y-4">
                                           <div>
                                               <h3 className="font-semibold text-foundry-text mb-2">Сохранить Мир</h3>
                                               <p className="text-sm text-foundry-text-muted mb-3">Save all loaded journals, actors, and items into a single file.</p>
                                               <button onClick={handleSaveWorld} disabled={journals.length === 0 && actors.length === 0 && items.length === 0} className="w-full px-4 py-2 bg-foundry-accent text-white font-semibold rounded-md hover:bg-orange-500 transition-colors disabled:bg-foundry-light disabled:cursor-not-allowed">
                                                   Save World
                                               </button>
                                           </div>
                                           <div className="border-t border-foundry-light pt-4">
                                               <h3 className="font-semibold text-foundry-text mb-2">Загрузить Мир</h3>
                                               <p className="text-sm text-foundry-text-muted mb-3">Load a previously saved world file to restore your workspace.</p>
                                               <button onClick={() => worldInputRef.current?.click()} className="w-full px-4 py-2 bg-foundry-light text-foundry-text font-semibold rounded-md hover:bg-foundry-accent hover:text-white transition-colors">
                                                   Load World
                                               </button>
                                               <input type="file" ref={worldInputRef} accept=".json" className="hidden" onChange={(e) => { if(e.target.files) handleLoadWorldFile(e.target.files[0]); e.target.value = ''; }} />
                                           </div>
                                           <div className="border-t border-foundry-light pt-4">
                                               <h3 className="font-semibold text-foundry-text mb-2">Загрузить локализацию</h3>
                                               <p className="text-sm text-foundry-text-muted mb-3">Загрузите JSON-файл локализации, чтобы заменить ключи (например, @Localize[...]) на переведенный текст.</p>
                                               <button onClick={() => localizationInputRef.current?.click()} className="w-full px-4 py-2 bg-foundry-light text-foundry-text font-semibold rounded-md hover:bg-foundry-accent hover:text-white transition-colors">
                                                   Загрузить файл локализации
                                               </button>
                                               <input type="file" ref={localizationInputRef} accept=".json" className="hidden" onChange={(e) => { if(e.target.files) handleLoadLocalizationFile(e.target.files[0]); e.target.value = ''; }} />
                                           </div>
                                       </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;
