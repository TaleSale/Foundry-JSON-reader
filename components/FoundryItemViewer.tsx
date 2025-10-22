
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { processFoundryTags } from '../utils/foundryParser';

interface FoundryItemViewerProps {
  data: any;
  onOpenActorByName: (actorName: string) => void;
  onOpenItemByName: (itemName: string) => void;
  localizationData: Record<string, any> | null;
}

const TraitPill: React.FC<{ trait: string }> = ({ trait }) => (
    <span className="bg-foundry-light text-xs uppercase px-2 py-1 rounded">{trait}</span>
);

const DetailRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="border-b border-foundry-light py-2">
        <span className="font-bold text-sm text-foundry-text-muted">{label}</span>
        <div className="text-foundry-text mt-1">{children}</div>
    </div>
);

const renderDescription = (desc: string, localizationData: Record<string, any> | null) => {
    if (!desc) return null;
    const processed = processFoundryTags(desc, [], localizationData);
    return <div className="text-sm text-foundry-text journal-page-content" dangerouslySetInnerHTML={{ __html: processed }} />;
};

// --- Rune Name Helpers ---
const getStrikingRuneName = (level: number) => {
    if (level >= 3) return 'Major Striking';
    if (level === 2) return 'Greater Striking';
    if (level === 1) return 'Striking';
    return '';
};

const getResilientRuneName = (level: number) => {
    if (level >= 3) return 'Major Resilient';
    if (level === 2) return 'Greater Resilient';
    if (level === 1) return 'Resilient';
    return '';
};


const WeaponDetails: React.FC<{ system: any }> = ({ system }) => {
    const runes = system.runes || {};
    const potencyBonus = runes.potency || 0;
    const strikingBonus = runes.striking || 0;
    
    const attackBonus = (system.bonus?.value || 0) + potencyBonus;
    const damageDice = (system.damage.dice || 1) + strikingBonus;

    return (
        <>
            <h4 className="text-md font-bold text-foundry-accent border-b-2 border-foundry-accent mb-2 mt-4">Weapon Stats</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Attack Bonus:</strong> {attackBonus > 0 ? `+${attackBonus}` : attackBonus}</div>
                <div><strong>Damage:</strong> {damageDice}d{system.damage.die} {system.damage.damageType}</div>
                <div><strong>Group:</strong> {system.group}</div>
                {system.range && <div><strong>Range:</strong> {system.range}</div>}
                <div><strong>Category:</strong> {system.category}</div>
            </div>
        </>
    );
};

const ArmorDetails: React.FC<{ system: any }> = ({ system }) => {
    const runes = system.runes || {};
    const potencyBonus = runes.potency || 0;
    const resilientBonus = runes.resilient || 0;
    
    const totalAcBonus = (system.acBonus || 0) + potencyBonus;

    return (
     <>
        <h4 className="text-md font-bold text-foundry-accent border-b-2 border-foundry-accent mb-2 mt-4">Armor Stats</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>AC Bonus:</strong> {totalAcBonus}</div>
            {resilientBonus > 0 && <div><strong>Saving Throw Bonus:</strong> +{resilientBonus}</div>}
            <div><strong>Dex Cap:</strong> {system.dexCap}</div>
            <div><strong>Check Penalty:</strong> {system.checkPenalty}</div>
            <div><strong>Speed Penalty:</strong> {system.speedPenalty}ft</div>
            <div><strong>Strength:</strong> {system.strength}</div>
            <div><strong>Group:</strong> {system.group}</div>
            <div><strong>Category:</strong> {system.category}</div>
        </div>
    </>
    );
};

const ConsumableDetails: React.FC<{ system: any, localizationData: Record<string, any> | null }> = ({ system, localizationData }) => (
    <>
        <h4 className="text-md font-bold text-foundry-accent border-b-2 border-foundry-accent mb-2 mt-4">Consumable Details</h4>
        <div className="text-sm">
            <div><strong>Uses:</strong> {system.uses.value} of {system.uses.max} (auto-destroy: {system.uses.autoDestroy ? 'Yes' : 'No'})</div>
        </div>
        {system.spell && (
            <div className="mt-4 p-3 bg-foundry-dark rounded-md">
                <h5 className="font-bold">Embedded Spell: {system.spell.name}</h5>
                {renderDescription(system.spell.system.description.value, localizationData)}
            </div>
        )}
    </>
);

const EffectDetails: React.FC<{ system: any }> = ({ system }) => (
    <>
        <h4 className="text-md font-bold text-foundry-accent border-b-2 border-foundry-accent mb-2 mt-4">Effect Details</h4>
        <div className="text-sm">
            <p><strong>Duration:</strong> {system.duration.value === -1 ? system.duration.unit : `${system.duration.value} ${system.duration.unit}`}</p>
            {system.rules?.length > 0 && (
                <div className="mt-2">
                    <strong>Rules:</strong>
                    <ul className="list-disc pl-5 mt-1">
                        {system.rules.map((rule: any, index: number) => (
                            <li key={index} className="font-mono text-xs bg-foundry-dark p-2 rounded my-1">
                                {JSON.stringify(rule)}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    </>
);


const FoundryItemViewer: React.FC<FoundryItemViewerProps> = ({ data, onOpenActorByName, onOpenItemByName, localizationData }) => {
    const [imgError, setImgError] = useState(false);
    const { system, type, name } = data;
    const itemViewerRef = useRef<HTMLDivElement>(null);

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

        const contentElement = itemViewerRef.current;
        if (contentElement) {
            contentElement.addEventListener('click', handleContentClick);
        }

        return () => {
            if (contentElement) {
                contentElement.removeEventListener('click', handleContentClick);
            }
        };
    }, [onOpenActorByName, onOpenItemByName]);

    
    const modifiedName = useMemo(() => {
        const runes = system.runes || {};
        const potencyBonus = runes.potency || 0;
        let prefix = '';
        if (potencyBonus > 0) {
            prefix += `+${potencyBonus} `;
        }
        if (type === 'weapon' && runes.striking > 0) {
            prefix += `${getStrikingRuneName(runes.striking)} `;
        }
        if (type === 'armor' && runes.resilient > 0) {
            prefix += `${getResilientRuneName(runes.resilient)} `;
        }
        return `${prefix}${name}`.trim();
    }, [name, type, system.runes]);

    const renderItemDetails = () => {
        switch (data.type) {
            case 'weapon': return <WeaponDetails system={system} />;
            case 'armor': return <ArmorDetails system={system} />;
            case 'consumable': return <ConsumableDetails system={system} localizationData={localizationData} />;
            case 'effect': return <EffectDetails system={system} />;
            case 'equipment': // Catches runes and other gear
                 return null;
            default:
                return <p className="text-foundry-text-muted italic mt-4">No specific details view for item type '{data.type}'.</p>;
        }
    };

    if (!system) {
        return <div className="p-4 text-center">Invalid Item data format.</div>;
    }
    
    const runes = system.runes || {};
    const potencyBonus = runes.potency || 0;
    const strikingBonus = type === 'weapon' ? (runes.striking || 0) : 0;
    const resilientBonus = type === 'armor' ? (runes.resilient || 0) : 0;

    const price = system.price?.value;
    let priceString = 'N/A';
    if (price) {
        priceString = Object.entries(price).map(([currency, amount]) => `${amount} ${currency}`).join(', ');
    }
    
    return (
        <div ref={itemViewerRef} className="bg-foundry-mid text-foundry-text h-full flex flex-col font-sans overflow-y-auto">
             <header className="bg-foundry-dark p-3 border-b border-foundry-light flex justify-between items-start sticky top-0 z-10">
                <h2 className="text-2xl font-bold text-foundry-accent">{modifiedName}</h2>
                <div className="text-right">
                    <span className="text-lg font-bold">ITEM {system.level.value}</span>
                </div>
            </header>
            
            <main className="flex-grow p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column */}
                <aside className="md:col-span-1 space-y-4">
                    {!imgError && data.img && (
                        <div className="bg-foundry-dark p-2 rounded-md border border-foundry-light flex justify-center items-center">
                            <img 
                                src={data.img} 
                                alt={data.name} 
                                className="max-h-48 object-contain"
                                onError={() => setImgError(true)}
                            />
                        </div>
                    )}
                    
                    <div className="bg-foundry-dark p-3 rounded-md border border-foundry-light space-y-2">
                        <DetailRow label="Price">{priceString}</DetailRow>
                        <DetailRow label="Bulk">{system.bulk?.value ?? 'N/A'}</DetailRow>
                        <DetailRow label="Traits">
                            <div className="flex flex-wrap gap-1 mt-1">
                                {(system.traits.value || []).map((trait: string) => (
                                    <TraitPill key={trait} trait={trait} />
                                ))}
                            </div>
                        </DetailRow>
                        {(type === 'weapon' || type === 'armor') && (
                            <DetailRow label="Runes">
                                <div className="flex flex-col gap-1 mt-1 text-sm">
                                    {potencyBonus > 0 && <span>• +{potencyBonus} {type === 'weapon' ? 'Weapon' : 'Armor'} Potency</span>}
                                    {strikingBonus > 0 && <span>• {getStrikingRuneName(strikingBonus)}</span>}
                                    {resilientBonus > 0 && <span>• {getResilientRuneName(resilientBonus)}</span>}
                                    {(potencyBonus === 0 && strikingBonus === 0 && resilientBonus === 0) && <span className="text-foundry-text-muted italic">None</span>}
                                </div>
                            </DetailRow>
                        )}
                    </div>
                </aside>

                {/* Right Column */}
                <article className="md:col-span-2">
                     <div className="bg-foundry-dark p-4 rounded-md border border-foundry-light">
                        <h3 className="text-lg font-bold text-foundry-accent border-b-2 border-foundry-accent mb-2">Description</h3>
                        {renderDescription(system.description.value, localizationData)}
                        {renderItemDetails()}
                    </div>
                </article>
            </main>
        </div>
    );
};

export default FoundryItemViewer;
