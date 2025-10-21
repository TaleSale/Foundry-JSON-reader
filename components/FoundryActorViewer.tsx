
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { processFoundryTags } from '../utils/foundryParser';

interface FoundryActorViewerProps {
  data: any;
  onOpenActorByName: (actorName: string) => void;
  onOpenItemByName: (itemName: string) => void;
}

const StatBlock: React.FC<{ label: string; value: any; details?: string }> = ({ label, value, details }) => (
    <div className="flex justify-between items-baseline border-b border-foundry-light py-1">
        <span className="font-bold text-sm">{label}</span>
        <div className="text-right">
            <span className="text-lg font-semibold text-foundry-accent">{value}</span>
            {details && <p className="text-xs text-foundry-text-muted">{details}</p>}
        </div>
    </div>
);

const SkillBlock: React.FC<{ label: string; value: number; }> = ({label, value}) => (
    <div className="flex justify-between text-sm py-0.5">
        <span>{label}</span>
        <span className="font-semibold">
            {value > 0 ? `+${value}`: value}
        </span>
    </div>
)

const FoundryActorViewer: React.FC<FoundryActorViewerProps> = ({ data, onOpenActorByName, onOpenItemByName }) => {
    const [activeTab, setActiveTab] = useState('main');
    const system = data.system;
    const actorViewerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleContentClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const link = target.closest<HTMLAnchorElement>('a.internal-journal-link');

            if (link) {
                event.preventDefault();
                const actorName = link.dataset.actorName;
                const itemName = link.dataset.itemName;
                
                if (actorName) {
                    onOpenActorByName(actorName);
                } else if (itemName) {
                    onOpenItemByName(itemName);
                }
            }
        };

        const contentElement = actorViewerRef.current;
        if (contentElement) {
            contentElement.addEventListener('click', handleContentClick);
        }

        return () => {
            if (contentElement) {
                contentElement.removeEventListener('click', handleContentClick);
            }
        };
    }, [onOpenActorByName, onOpenItemByName]);

    const { attacks, actions } = useMemo(() => {
        const attacks = data.items?.filter((item: any) => item.type === 'melee' || item.type === 'ranged') || [];
        const actions = data.items?.filter((item: any) => item.type === 'action') || [];
        return { attacks, actions };
    }, [data.items]);

    const renderDescription = (desc: string) => {
        const processed = processFoundryTags(desc, []);
        return <div className="text-sm text-foundry-text-muted journal-page-content" dangerouslySetInnerHTML={{ __html: processed }} />;
    };

    if (!system) {
        return <div className="p-4 text-center">Invalid Actor data format.</div>;
    }

    const ActorTabButton: React.FC<{tabId: string, label: string}> = ({ tabId, label }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tabId
                    ? 'border-foundry-accent text-foundry-accent'
                    : 'border-transparent text-foundry-text-muted hover:text-foundry-text'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div ref={actorViewerRef} className="bg-foundry-mid text-foundry-text h-full flex flex-col font-sans overflow-hidden">
            {/* Header */}
            <header className="bg-foundry-dark p-3 border-b border-foundry-light flex justify-between items-center">
                <h2 className="text-2xl font-bold text-foundry-accent">{data.name}</h2>
                <div className="text-right">
                    <span className="text-lg font-bold">СУЩЕСТВО {system.details.level.value}</span>
                    <div className="flex gap-2 mt-1">
                        {system.traits.value.map((trait: string) => (
                             <span key={trait} className="bg-foundry-light text-xs uppercase px-2 py-1 rounded">{trait}</span>
                        ))}
                    </div>
                </div>
            </header>

            <div className="flex flex-grow overflow-hidden">
                {/* Left Sidebar */}
                <aside className="w-60 bg-foundry-dark p-3 space-y-3 overflow-y-auto flex-shrink-0">
                    <StatBlock label="КБ" value={system.attributes.ac.value} />
                    <StatBlock label="ОЗ" value={system.attributes.hp.value} details={`max ${system.attributes.hp.max}`} />
                    <StatBlock label="Скорости" value={system.attributes.speed.value} details={system.attributes.speed.otherSpeeds?.map((s:any) => `${s.type} ${s.value}`).join(', ')} />
                    
                    <div className="border-t border-foundry-light pt-2">
                        <StatBlock label="Стойкость" value={system.saves.fortitude.value > 0 ? `+${system.saves.fortitude.value}` : system.saves.fortitude.value} />
                        <StatBlock label="Рефлекс" value={system.saves.reflex.value > 0 ? `+${system.saves.reflex.value}` : system.saves.reflex.value} />
                        <StatBlock label="Воля" value={system.saves.will.value > 0 ? `+${system.saves.will.value}` : system.saves.will.value} />
                    </div>

                    <div className="border-t border-foundry-light pt-2">
                         <h3 className="font-bold text-foundry-accent mb-1">Perception</h3>
                         <SkillBlock label="Perception" value={system.perception.mod} />
                         <p className="text-xs text-foundry-text-muted pl-2">
                            {system.perception.senses?.map((s: any) => s.type).join(', ')}
                         </p>
                    </div>

                    <div className="border-t border-foundry-light pt-2">
                         <h3 className="font-bold text-foundry-accent mb-1">Skills</h3>
                        {Object.entries(system.skills).map(([key, value]: [string, any]) => (
                            <SkillBlock key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} value={value.base} />
                        ))}
                    </div>

                     <div className="border-t border-foundry-light pt-2 grid grid-cols-3 gap-2 text-center">
                         <h3 className="font-bold text-foundry-accent col-span-3 mb-1">Abilities</h3>
                         {Object.entries(system.abilities).map(([key, value]: [string, any]) => (
                             <div key={key}>
                                 <div className="font-bold uppercase text-sm">{key}</div>
                                 <div className="text-lg">{value.mod > 0 ? `+${value.mod}` : value.mod}</div>
                             </div>
                         ))}
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 flex flex-col overflow-hidden">
                    <nav className="flex-shrink-0 border-b border-foundry-light px-2">
                        <ActorTabButton tabId="main" label="Основное" />
                        <ActorTabButton tabId="inventory" label="Инвентарь" />
                        <ActorTabButton tabId="notes" label="Заметки" />
                    </nav>

                    <div className="flex-grow p-4 overflow-y-auto">
                        {activeTab === 'main' && (
                            <div className="space-y-4">
                                {attacks.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-bold border-b-2 border-foundry-accent mb-2">Атаки</h3>
                                        <div className="space-y-3">
                                            {attacks.map((item: any) => (
                                                <div key={item._id} className="bg-foundry-dark p-3 rounded">
                                                    <p className="font-bold text-base">{item.name}</p>
                                                    <div className="flex items-center gap-4 text-sm mt-1">
                                                        <span><strong>Attack:</strong> <span className="text-foundry-accent">{item.system.bonus.value > 0 ? `+${item.system.bonus.value}`: item.system.bonus.value}</span></span>
                                                        <span><strong>Damage:</strong> <span className="text-red-400">{Object.values(item.system.damageRolls).map((d: any) => `${d.damage} ${d.damageType}`).join(', ')}</span></span>
                                                    </div>
                                                    <div className="text-xs text-foundry-text-muted mt-1">
                                                        Traits: {item.system.traits.value.join(', ')}
                                                    </div>
                                                    {item.system.description.value && renderDescription(item.system.description.value)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {actions.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-bold border-b-2 border-foundry-accent mb-2">Действия и Пассивные способности</h3>
                                        <div className="space-y-3">
                                            {actions.map((item: any) => (
                                                <div key={item._id} className="bg-foundry-dark p-3 rounded">
                                                    <p className="font-bold text-base">{item.name}</p>
                                                     <div className="text-xs text-foundry-text-muted mt-1">
                                                        Traits: {item.system.traits.value.join(', ')}
                                                    </div>
                                                    {renderDescription(item.system.description.value)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'inventory' && (
                            <div className="text-center text-foundry-text-muted pt-8">Inventory view is not yet implemented.</div>
                        )}
                         {activeTab === 'notes' && (
                            <div className="space-y-4 journal-page-content">
                                {system.details.publicNotes && (
                                    <div>
                                        <h3 className="text-lg font-bold text-foundry-accent mb-2">Описание</h3>
                                        <div dangerouslySetInnerHTML={{__html: processFoundryTags(system.details.publicNotes, [])}} />
                                    </div>
                                )}
                                {system.details.privateNotes && (
                                    <div>
                                        <h3 className="text-lg font-bold text-foundry-accent mb-2">Личные заметки</h3>
                                        <div dangerouslySetInnerHTML={{__html: processFoundryTags(system.details.privateNotes, [])}} />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default FoundryActorViewer;
