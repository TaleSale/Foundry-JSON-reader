import React, { useState, useMemo, useRef, useEffect } from 'react';
import { processFoundryTags, localize, formatPrice, formatBulk, slugToPascalCase } from '../utils/foundryParser';
import { Journal } from '../services/geminiService';

interface FoundryItemViewerProps {
  data: any;
  onOpenActorByName: (actorName: string) => void;
  onOpenItemByName: (itemName: string) => void;
  onOpenJournalAndPage: (journalFoundryId: string, pageFoundryId: string) => void;
  localizationData: Record<string, any> | null;
  journals: Journal[];
}

const TraitPill: React.FC<{ trait: string, localizationData: Record<string, any> | null }> = ({ trait, localizationData }) => {
    const pascalSlug = slugToPascalCase(trait);
    const labelKey = `PF2E.Trait${pascalSlug}`;
    const label = localize(localizationData, labelKey, {}) || pascalSlug;
    return <span className="bg-foundry-light text-xs uppercase px-2 py-1 rounded">{label}</span>
};

const DetailRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="border-b border-foundry-light py-2">
        <span className="font-bold text-sm text-foundry-text-muted">{label}</span>
        <div className="text-foundry-text mt-1">{children}</div>
    </div>
);

const renderDescription = (desc: string, localizationData: Record<string, any> | null, journals: Journal[]) => {
    if (!desc) return null;
    const processed = processFoundryTags(desc, { journals }, localizationData);
    return <div className="text-sm text-foundry-text journal-page-content" dangerouslySetInnerHTML={{ __html: processed }} />;
};

// --- Rune Name Helpers ---
const getStrikingRuneName = (level: number, locData: any) => {
    if (level >= 3) return localize(locData, 'PF2E.Item.Weapon.Rune.Striking.Major', {});
    if (level === 2) return localize(locData, 'PF2E.Item.Weapon.Rune.Striking.Greater', {});
    if (level === 1) return localize(locData, 'PF2E.Item.Weapon.Rune.Striking.Striking', {});
    return '';
};

const getResilientRuneName = (level: number, locData: any) => {
    if (level >= 3) return localize(locData, 'PF2E.ArmorMajorResilientRune', {});
    if (level === 2) return localize(locData, 'PF2E.ArmorGreaterResilientRune', {});
    if (level === 1) return localize(locData, 'PF2E.ArmorResilientRune', {});
    return '';
};


const WeaponDetails: React.FC<{ system: any, localizationData: Record<string, any> | null }> = ({ system, localizationData }) => {
    const runes = system.runes || {};
    const potencyBonus = runes.potency || 0;
    const strikingBonus = runes.striking || 0;
    
    const attackBonus = (system.bonus?.value || 0) + potencyBonus;
    const damageDice = (system.damage.dice || 1) + strikingBonus;
    const localizedGroup = localize(localizationData, `PF2E.WeaponGroup${slugToPascalCase(system.group)}`) || system.group;

    return (
        <>
            <h4 className="text-md font-bold text-foundry-accent border-b-2 border-foundry-accent mb-2 mt-4">Характеристики оружия</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>{localize(localizationData, 'PF2E.AttackLabel', {})}:</strong> {attackBonus > 0 ? `+${attackBonus}` : attackBonus}</div>
                <div><strong>{localize(localizationData, 'PF2E.DamageLabel', {})}:</strong> {damageDice}d{system.damage.die} {system.damage.damageType}</div>
                <div><strong>{localize(localizationData, 'PF2E.Item.Weapon.GroupLabel', {})}:</strong> {localizedGroup}</div>
                {system.range && <div><strong>{localize(localizationData, 'PF2E.Actor.Creature.Sense.RangeLabel', {})}:</strong> {system.range}</div>}
                <div><strong>{localize(localizationData, 'PF2E.Item.FIELDS.category.label', {})}:</strong> {system.category}</div>
            </div>
        </>
    );
};

const ArmorDetails: React.FC<{ system: any, localizationData: Record<string, any> | null }> = ({ system, localizationData }) => {
    const runes = system.runes || {};
    const potencyBonus = runes.potency || 0;
    const resilientBonus = runes.resilient || 0;
    
    const totalAcBonus = (system.acBonus || 0) + potencyBonus;
    const localizedGroup = localize(localizationData, `PF2E.ArmorGroup${slugToPascalCase(system.group)}`) || system.group;

    return (
     <>
        <h4 className="text-md font-bold text-foundry-accent border-b-2 border-foundry-accent mb-2 mt-4">Характеристики брони</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>{localize(localizationData, 'PF2E.ArmorArmorLabel', {})}:</strong> {totalAcBonus}</div>
            {resilientBonus > 0 && <div><strong>Бонус спасбросков:</strong> +{resilientBonus}</div>}
            <div><strong>{localize(localizationData, 'PF2E.ArmorDexLabel', {})}:</strong> {system.dexCap}</div>
            <div><strong>{localize(localizationData, 'PF2E.ArmorCheckLabel', {})}:</strong> {system.checkPenalty}</div>
            <div><strong>{localize(localizationData, 'PF2E.ArmorSpeedLabel', {})}:</strong> {system.speedPenalty}ft</div>
            <div><strong>{localize(localizationData, 'PF2E.ArmorStrengthLabel', {})}:</strong> {system.strength}</div>
            <div><strong>{localize(localizationData, 'PF2E.Item.Armor.GroupLabel', {})}:</strong> {localizedGroup}</div>
            <div><strong>{localize(localizationData, 'PF2E.Item.FIELDS.category.label', {})}:</strong> {system.category}</div>
        </div>
    </>
    );
};

const ConsumableDetails: React.FC<{ system: any, localizationData: Record<string, any> | null, journals: Journal[] }> = ({ system, localizationData, journals }) => (
    <>
        <h4 className="text-md font-bold text-foundry-accent border-b-2 border-foundry-accent mb-2 mt-4">Детали расходуемого</h4>
        <div className="text-sm">
            <div><strong>{localize(localizationData, 'PF2E.Item.Consumable.Uses.Label', {})}:</strong> {system.uses.value} of {system.uses.max} (auto-destroy: {system.uses.autoDestroy ? 'Yes' : 'No'})</div>
        </div>
        {system.spell && (
            <div className="mt-4 p-3 bg-foundry-dark rounded-md">
                <h5 className="font-bold">{localize(localizationData, 'PF2E.Item.Consumable.Spell.Label', {})}: {system.spell.name}</h5>
                {renderDescription(system.spell.system.description.value, localizationData, journals)}
            </div>
        )}
    </>
);

const EffectDetails: React.FC<{ system: any, localizationData: Record<string, any> | null }> = ({ system, localizationData }) => (
    <>
        <h4 className="text-md font-bold text-foundry-accent border-b-2 border-foundry-accent mb-2 mt-4">Детали эффекта</h4>
        <div className="text-sm">
            <p><strong>{localize(localizationData, 'PF2E.Time.Duration', {})}:</strong> {system.duration.value === -1 ? system.duration.unit : `${system.duration.value} ${system.duration.unit}`}</p>
            {system.rules?.length > 0 && (
                <div className="mt-2">
                    <strong>{localize(localizationData, 'PF2E.Item.Rules.Tab', {})}:</strong>
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


const FoundryItemViewer: React.FC<FoundryItemViewerProps> = ({ data, onOpenActorByName, onOpenItemByName, onOpenJournalAndPage, localizationData, journals }) => {
    const { system, type, name } = data;
    const itemViewerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleContentClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const link = target.closest<HTMLAnchorElement>('a.internal-journal-link');

            if (link) {
                event.preventDefault();
                const journalFoundryId = link.dataset.journalFoundryId;
                const pageFoundryId = link.dataset.pageFoundryId;
                const actorName = link.dataset.actorName;
                const itemName = link.dataset.itemName;
                
                if (journalFoundryId && pageFoundryId) {
                    onOpenJournalAndPage(journalFoundryId, pageFoundryId);
                } else if (actorName) {
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
    }, [onOpenActorByName, onOpenItemByName, onOpenJournalAndPage]);

    
    const modifiedName = useMemo(() => {
        const runes = system.runes || {};
        const potencyBonus = runes.potency || 0;
        let prefix = '';
        if (potencyBonus > 0) {
            prefix += `+${potencyBonus} `;
        }
        if (type === 'weapon' && runes.striking > 0) {
            prefix += `${getStrikingRuneName(runes.striking, localizationData)} `;
        }
        if (type === 'armor' && runes.resilient > 0) {
            prefix += `${getResilientRuneName(runes.resilient, localizationData)} `;
        }
        return `${prefix}${name}`.trim();
    }, [name, type, system.runes, localizationData]);

    const renderItemDetails = () => {
        switch (data.type) {
            case 'weapon': return <WeaponDetails system={system} localizationData={localizationData} />;
            case 'armor': return <ArmorDetails system={system} localizationData={localizationData} />;
            case 'consumable': return <ConsumableDetails system={system} localizationData={localizationData} journals={journals} />;
            case 'effect': return <EffectDetails system={system} localizationData={localizationData} />;
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

    const priceString = formatPrice(system.price, localizationData);
    
    return (
        <div ref={itemViewerRef} className="bg-foundry-mid text-foundry-text h-full flex flex-col font-sans overflow-y-auto">
             <header className="bg-foundry-dark p-3 border-b border-foundry-light flex justify-between items-start sticky top-0 z-10">
                <h2 className="text-2xl font-bold text-foundry-accent">{modifiedName}</h2>
                <div className="text-right">
                    <span className="text-lg font-bold">{localize(localizationData, 'PF2E.ItemLevel', { type: localize(localizationData, 'PF2E.ItemTitle', {}), level: system.level.value })}</span>
                </div>
            </header>
            
            <main className="flex-grow p-4">
                <article className="bg-foundry-dark p-4 rounded-md border border-foundry-light">
                    <div className="flex flex-wrap gap-1 mb-4">
                        {(system.traits.value || []).map((trait: string) => (
                            <TraitPill key={trait} trait={trait} localizationData={localizationData} />
                        ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mb-4">
                        <DetailRow label={localize(localizationData, 'PF2E.PriceLabel', {}).replace(':','')}>{priceString}</DetailRow>
                        <DetailRow label={localize(localizationData, 'PF2E.Item.Physical.Bulk.Label', {})}>{formatBulk(system.bulk, localizationData) ?? 'N/A'}</DetailRow>
                        {(type === 'weapon' || type === 'armor') && (
                            <div className="sm:col-span-2">
                                <DetailRow label="Руны">
                                    <div className="flex flex-col gap-1 mt-1 text-sm">
                                        {potencyBonus > 0 && <span>• {localize(localizationData, type === 'weapon' ? `PF2E.WeaponPotencyRune${potencyBonus}`: `PF2E.ArmorPotencyRune${potencyBonus}`)}</span>}
                                        {strikingBonus > 0 && <span>• {getStrikingRuneName(strikingBonus, localizationData)}</span>}
                                        {resilientBonus > 0 && <span>• {getResilientRuneName(resilientBonus, localizationData)}</span>}
                                        {(potencyBonus === 0 && strikingBonus === 0 && resilientBonus === 0) && <span className="text-foundry-text-muted italic">{localize(localizationData, 'PF2E.NoneOption')}</span>}
                                    </div>
                                </DetailRow>
                            </div>
                        )}
                    </div>
                    
                    <h3 className="text-lg font-bold text-foundry-accent border-b-2 border-foundry-accent mb-2">{localize(localizationData, 'PF2E.HazardDescriptionLabel', {})}</h3>
                    {renderDescription(system.description.value, localizationData, journals)}
                    {renderItemDetails()}
                </article>
            </main>
        </div>
    );
};

export default FoundryItemViewer;
