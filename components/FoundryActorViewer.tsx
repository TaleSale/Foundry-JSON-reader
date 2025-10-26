import React, { useState, useMemo, useRef, useEffect } from 'react';
import { processFoundryTags, resolvePath, localize, formatPrice, formatBulk, slugToPascalCase } from '../utils/foundryParser';
import { Journal } from '../services/geminiService';

interface FoundryActorViewerProps {
  data: any;
  onOpenActorByName: (actorName: string) => void;
  onOpenItemByName: (itemName: string) => void;
  onOpenJournalAndPage: (journalFoundryId: string, pageFoundryId: string) => void;
  localizationData: Record<string, any> | null;
  journals: Journal[];
}

const Trait: React.FC<{
    slug: string;
    isSize?: boolean;
    localizationData: Record<string, any> | null;
}> = ({ slug, isSize = false, localizationData }) => {
    if (!slug) return null;

    const pascalSlug = slugToPascalCase(slug);
    
    // Handle size abbreviations
    const sizeMap: Record<string, string> = { Med: 'Medium', Sm: 'Small', Lg: 'Large', Tiny: 'Tiny', Huge: 'Huge', Grg: 'Gargantuan' };
    const finalSlug = isSize ? (sizeMap[pascalSlug] || pascalSlug) : pascalSlug;
    
    const labelKey = isSize ? `PF2E.ActorSize${finalSlug}` : `PF2E.Trait${finalSlug}`;
    const descriptionKey = `PF2E.TraitDescription${finalSlug}`;
    
    const label = (localizationData && resolvePath(localizationData, labelKey)) || finalSlug;
    const description = (localizationData && resolvePath(localizationData, descriptionKey)) || '';

    const sanitizedDescription = description.replace(/<[^>]*>/g, '').replace(/"/g, '&quot;');
    return (
        <span className="trait-tooltip" title={sanitizedDescription}>
            <code className="trait-code">{label}</code>
        </span>
    );
};


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
);

const getActionIcon = (actions: string | null) => {
    if (!actions) return null;
    const actionMap: Record<string, string> = {
        '1': '1', '2': '2', '3': '3',
        'reaction': 'R', 'free': 'F'
    };
    const actionSymbol = actionMap[actions];
    if (actionSymbol) {
        return <span className="action-glyph" title={`${actions} action${actions !== '1' ? 's' : ''}`}>{actionSymbol}</span>;
    }
    return <span className="text-xs">({actions})</span>;
};

const Spell: React.FC<{spell: any, localizationData: any, journals: Journal[], onOpenJournalAndPage: (j:string, p:string)=>void}> = ({spell, localizationData, journals, onOpenJournalAndPage}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const system = spell.system;
    
    const renderSpellDescription = (desc: string) => {
        if (!desc) return null;
        const processed = processFoundryTags(desc, { journals, currentJournalId: undefined }, localizationData);
        return <div className="text-sm text-foundry-text-muted mt-2 journal-page-content" dangerouslySetInnerHTML={{ __html: processed }} />;
    };

    return (
        <li className="p-2 rounded transition-colors hover:bg-foundry-light/50">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <span className="font-semibold">{spell.name}</span>
                <div className="flex items-center gap-2">
                    {getActionIcon(system.time?.value)}
                    <span className="text-xl">{isExpanded ? '−' : '+'}</span>
                </div>
            </div>
            {isExpanded && (
                <div className="mt-2 border-t border-foundry-light pt-2">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-2">
                        {system.range?.value && <div><strong>{localize(localizationData, 'PF2E.Actor.Creature.Sense.RangeLabel')}:</strong> {system.range.value}</div>}
                        {system.target?.value && <div><strong>{localize(localizationData, 'PF2E.SpellTargetLabel')}:</strong> {system.target.value}</div>}
                        {system.duration?.value && <div><strong>{localize(localizationData, 'PF2E.Time.Duration')}:</strong> {system.duration.value}</div>}
                        {system.defense?.save?.statistic && (
                            <div>
                                <strong>{localize(localizationData, 'PF2E.SavingThrow')}:</strong> <span className="capitalize">{system.defense.save.statistic}</span>
                                {system.defense.save.basic && ` (${localize(localizationData, 'PF2E.Item.Spell.Defense.BasicSave')})`}
                            </div>
                        )}
                    </div>
                    {renderSpellDescription(system.description.value)}
                </div>
            )}
        </li>
    );
};

const SpellcastingEntry: React.FC<{entry: any, localizationData: any, journals: Journal[], onOpenJournalAndPage: (j:string, p:string)=>void}> = ({ entry, localizationData, journals, onOpenJournalAndPage }) => {
    const system = entry.system;
    const prepType = system.prepared.value;
    const localizedPrepType = localize(localizationData, `PF2E.PreparationType${prepType.charAt(0).toUpperCase() + prepType.slice(1)}`);

    return (
        <div className="bg-foundry-dark p-3 rounded-md">
            <header className="border-b border-foundry-light pb-2 mb-2">
                <h3 className="text-lg font-bold text-foundry-accent">{entry.name}</h3>
                <div className="flex gap-4 text-sm text-foundry-text-muted flex-wrap">
                    <span><strong>{localize(localizationData, 'PF2E.MagicTraditionLabel')}:</strong> {system.tradition.value}</span>
                    <span><strong>{localize(localizationData, 'PF2E.Roll.Type')}:</strong> {localizedPrepType}</span>
                    <span><strong>{localize(localizationData, 'PF2E.Actor.Creature.Spellcasting.DC')}:</strong> {system.spelldc.dc}</span>
                    <span><strong>{localize(localizationData, 'PF2E.AttackLabel')}:</strong> +{system.spelldc.value}</span>
                </div>
            </header>

            <div className="space-y-4">
                {Object.entries(entry.spellsByLevel).map(([level, spells]: [string, any[]]) => {
                    const slotKey = `slot${level === 'cantrip' ? 0 : level}`;
                    const slotInfo = system.slots[slotKey];
                    const hasSlots = slotInfo && slotInfo.max > 0;
                    
                    return (
                        <div key={level}>
                            <div className="flex justify-between items-baseline border-b border-foundry-light mb-1">
                                <h4 className="font-bold text-base">
                                    {level === 'cantrip' ? localize(localizationData, 'PF2E.Actor.Creature.Spellcasting.Cantrips') : localize(localizationData, 'PF2E.Item.Spell.Rank.Ordinal', { rank: level })}
                                </h4>
                                {hasSlots && (
                                    <span className="text-sm text-foundry-text-muted">
                                        {system.prepared.value === 'innate' ? `${slotInfo.max} ${localize(localizationData, 'PF2E.Frequency.per')} ${localize(localizationData, 'PF2E.Duration.day')}` : `Слоты: ${slotInfo.value} / ${slotInfo.max}`}
                                    </span>
                                )}
                            </div>
                            <ul className="space-y-1">
                                {spells.map(spell => (
                                    <Spell key={spell._id} spell={spell} localizationData={localizationData} journals={journals} onOpenJournalAndPage={onOpenJournalAndPage} />
                                ))}
                            </ul>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

// --- Inventory Components ---

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

const getStrikingRuneName = (level: number, locData: any) => {
    if (level >= 3) return localize(locData, 'PF2E.Item.Weapon.Rune.Striking.Major');
    if (level === 2) return localize(locData, 'PF2E.Item.Weapon.Rune.Striking.Greater');
    if (level === 1) return localize(locData, 'PF2E.Item.Weapon.Rune.Striking.Striking');
    return '';
};

const getResilientRuneName = (level: number, locData: any) => {
    if (level >= 3) return localize(locData, 'PF2E.ArmorMajorResilientRune');
    if (level === 2) return localize(locData, 'PF2E.ArmorGreaterResilientRune');
    if (level === 1) return localize(locData, 'PF2E.ArmorResilientRune');
    return '';
};

const WeaponDetails: React.FC<{ system: any, localizationData: any }> = ({ system, localizationData }) => {
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
                <div><strong>{localize(localizationData, 'PF2E.Actor.NPC.BonusLabel.modifier')}:</strong> {attackBonus > 0 ? `+${attackBonus}` : attackBonus}</div>
                <div><strong>{localize(localizationData, 'PF2E.DamageLabel')}:</strong> {damageDice}d{system.damage.die} {system.damage.damageType}</div>
                <div><strong>{localize(localizationData, 'PF2E.WeaponGroupLabel')}:</strong> {localizedGroup}</div>
                {system.range && <div><strong>{localize(localizationData, 'PF2E.Actor.Creature.Sense.RangeLabel')}:</strong> {system.range}</div>}
                <div><strong>{localize(localizationData, 'PF2E.Item.FIELDS.category.label')}:</strong> {system.category}</div>
            </div>
        </>
    );
};

const ArmorDetails: React.FC<{ system: any, localizationData: any }> = ({ system, localizationData }) => {
    const runes = system.runes || {};
    const potencyBonus = runes.potency || 0;
    const resilientBonus = runes.resilient || 0;
    
    const totalAcBonus = (system.acBonus || 0) + potencyBonus;
    const localizedGroup = localize(localizationData, `PF2E.ArmorGroup${slugToPascalCase(system.group)}`) || system.group;

    return (
     <>
        <h4 className="text-md font-bold text-foundry-accent border-b-2 border-foundry-accent mb-2 mt-4">Характеристики брони</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>{localize(localizationData, 'PF2E.ArmorArmorLabel')}:</strong> {totalAcBonus}</div>
            {resilientBonus > 0 && <div><strong>Бонус спасбросков:</strong> +{resilientBonus}</div>}
            <div><strong>{localize(localizationData, 'PF2E.ArmorDexLabel')}:</strong> {system.dexCap}</div>
            <div><strong>{localize(localizationData, 'PF2E.ArmorCheckLabel')}:</strong> {system.checkPenalty}</div>
            <div><strong>{localize(localizationData, 'PF2E.ArmorSpeedLabel')}:</strong> {system.speedPenalty}ft</div>
            <div><strong>{localize(localizationData, 'PF2E.ArmorStrengthLabel')}:</strong> {system.strength}</div>
            <div><strong>{localize(localizationData, 'PF2E.Item.Armor.GroupLabel')}:</strong> {localizedGroup}</div>
            <div><strong>{localize(localizationData, 'PF2E.Item.FIELDS.category.label')}:</strong> {system.category}</div>
        </div>
    </>
    );
};

const ConsumableDetails: React.FC<{ system: any, localizationData: Record<string, any> | null, renderDescription: (desc: string) => React.ReactNode }> = ({ system, localizationData, renderDescription }) => (
    <>
        <h4 className="text-md font-bold text-foundry-accent border-b-2 border-foundry-accent mb-2 mt-4">Детали расходуемого</h4>
        <div className="text-sm">
            <div><strong>{localize(localizationData, 'PF2E.Item.Consumable.Uses.Label')}:</strong> {system.uses.value} of {system.uses.max} (auto-destroy: {system.uses.autoDestroy ? 'Yes' : 'No'})</div>
        </div>
        {system.spell && (
            <div className="mt-4 p-3 bg-foundry-dark rounded-md">
                <h5 className="font-bold">{localize(localizationData, 'PF2E.Item.Consumable.Spell.Label')}: {system.spell.name}</h5>
                {renderDescription(system.spell.system.description.value)}
            </div>
        )}
    </>
);

const EffectDetails: React.FC<{ system: any, localizationData: any }> = ({ system, localizationData }) => (
    <>
        <h4 className="text-md font-bold text-foundry-accent border-b-2 border-foundry-accent mb-2 mt-4">Детали эффекта</h4>
        <div className="text-sm">
            <p><strong>{localize(localizationData, 'PF2E.Time.Duration')}:</strong> {system.duration.value === -1 ? system.duration.unit : `${system.duration.value} ${system.duration.unit}`}</p>
            {system.rules?.length > 0 && (
                <div className="mt-2">
                    <strong>{localize(localizationData, 'PF2E.Item.Rules.Tab')}:</strong>
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

const InventoryItemDetails: React.FC<{ item: any, localizationData: any, renderDescription: (desc: string) => React.ReactNode }> = ({ item, localizationData, renderDescription }) => {
    const { system, type, name } = item;

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
        switch (item.type) {
            case 'weapon': return <WeaponDetails system={system} localizationData={localizationData} />;
            case 'armor': return <ArmorDetails system={system} localizationData={localizationData} />;
            case 'consumable': return <ConsumableDetails system={system} localizationData={localizationData} renderDescription={renderDescription} />;
            case 'effect': return <EffectDetails system={system} localizationData={localizationData} />;
            default: return null;
        }
    };
    
    const runes = system.runes || {};
    const potencyBonus = runes.potency || 0;
    const strikingBonus = type === 'weapon' ? (runes.striking || 0) : 0;
    const resilientBonus = type === 'armor' ? (runes.resilient || 0) : 0;
    
    const priceString = formatPrice(system.price, localizationData);

    return (
         <div className="p-4 bg-foundry-dark">
             <header className="flex justify-between items-start">
                <h3 className="text-xl font-bold text-foundry-accent">{modifiedName}</h3>
                <div className="text-right">
                    <span className="text-lg font-bold">{localize(localizationData, 'PF2E.ItemLevel', { type: localize(localizationData, 'PF2E.ItemTitle'), level: system.level.value })}</span>
                </div>
            </header>
            
            <article className="bg-foundry-mid p-4 rounded-md border border-foundry-light mt-2">
                <div className="flex flex-wrap gap-1 mb-4">
                    {(system.traits.value || []).map((trait: string) => (
                        <TraitPill key={trait} trait={trait} localizationData={localizationData} />
                    ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mb-4">
                    <DetailRow label={localize(localizationData, 'PF2E.PriceLabel').replace(':', '')}>{priceString}</DetailRow>
                    <DetailRow label={localize(localizationData, 'PF2E.Item.Physical.Bulk.Label')}>{formatBulk(system.bulk, localizationData) ?? 'N/A'}</DetailRow>
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
                
                <h3 className="text-lg font-bold text-foundry-accent border-b-2 border-foundry-accent mb-2">{localize(localizationData, 'PF2E.HazardDescriptionLabel')}</h3>
                {renderDescription(system.description.value)}
                {renderItemDetails()}
            </article>
        </div>
    );
};


const InventoryItemRow: React.FC<{item: any, localizationData: any, renderDescription: (desc: string) => React.ReactNode}> = ({ item, localizationData, renderDescription }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <React.Fragment>
            <tr className="border-b border-foundry-light hover:bg-foundry-light/30 cursor-pointer" onClick={() => setIsExpanded(prev => !prev)}>
                <td className="p-2">
                    <span className="hover:text-foundry-accent">{item.name}</span>
                </td>
                <td className="p-2 text-center">{item.system.quantity ?? 1}</td>
                <td className="p-2 text-center">{formatBulk(item.system.bulk, localizationData)}</td>
                <td className="p-2 text-right">{formatPrice(item.system.price, localizationData)}</td>
            </tr>
            {isExpanded && (
                <tr className="border-b-2 border-foundry-accent bg-foundry-dark">
                    <td colSpan={4} className="p-0">
                        <InventoryItemDetails item={item} localizationData={localizationData} renderDescription={renderDescription} />
                    </td>
                </tr>
            )}
        </React.Fragment>
    );
};

const InventorySection: React.FC<{title: string, items: any[], localizationData: any, renderDescription: (desc: string) => React.ReactNode}> = ({ title, items, localizationData, renderDescription }) => {
    if (items.length === 0) return null;
    return (
        <div className="mb-4">
            {title && <h3 className="text-lg font-bold border-b-2 border-foundry-accent mb-2">{title}</h3>}
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-foundry-text-muted border-b-2 border-foundry-light">
                        <th className="p-2 w-1/2 font-semibold">{localize(localizationData, 'PF2E.Item.NameLabel')}</th>
                        <th className="p-2 text-center font-semibold">{localize(localizationData, 'PF2E.QuantityShortLabel')}</th>
                        <th className="p-2 text-center font-semibold">{localize(localizationData, 'PF2E.Item.Physical.Bulk.Label')}</th>
                        <th className="p-2 text-right font-semibold">{localize(localizationData, 'PF2E.PriceLabel').replace(':', '')}</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map(item => <InventoryItemRow key={item._id} item={item} localizationData={localizationData} renderDescription={renderDescription} />)}
                </tbody>
            </table>
        </div>
    );
};

const InventoryTab: React.FC<{items: any[], localizationData: any, renderDescription: (desc: string) => React.ReactNode}> = ({ items, localizationData, renderDescription }) => {
    const { weapons, shields, armor, equipment, consumables, treasure, containers } = useMemo(() => {
        const containerItemIds = new Set<string>();

        const containers = items
            .filter(item => item.type === 'backpack') // Foundry uses 'backpack' for containers
            .map(container => {
                const contents = items.filter(item => item.system.containerId === container._id);
                contents.forEach(item => containerItemIds.add(item._id));
                return { ...container, contents };
            });
        
        const uncontained = items.filter(i => !containerItemIds.has(i._id) && i.type !== 'backpack');

        return {
            weapons: uncontained.filter(i => i.type === 'weapon'),
            shields: uncontained.filter(i => i.type === 'shield'),
            armor: uncontained.filter(i => i.type === 'armor'),
            equipment: uncontained.filter(i => i.type === 'equipment'),
            consumables: uncontained.filter(i => i.type === 'consumable'),
            treasure: uncontained.filter(i => i.type === 'treasure'),
            containers,
        }
    }, [items]);

    const allItems = [...weapons, ...shields, ...armor, ...equipment, ...consumables, ...treasure, ...containers];
    if (allItems.length === 0) {
        return <div className="text-center text-foundry-text-muted pt-8">У этого актера нет предметов в инвентаре.</div>;
    }

    return (
        <div className="space-y-4">
            <InventorySection title={localize(localizationData, 'PF2E.TraitWeapons')} items={weapons} localizationData={localizationData} renderDescription={renderDescription} />
            <InventorySection title={localize(localizationData, 'PF2E.ShieldLabel')} items={shields} localizationData={localizationData} renderDescription={renderDescription} />
            <InventorySection title={localize(localizationData, 'PF2E.Actor.NPC.AddArmor')} items={armor} localizationData={localizationData} renderDescription={renderDescription} />
            <InventorySection title={localize(localizationData, 'PF2E.CompendiumBrowser.TabEquipment')} items={equipment} localizationData={localizationData} renderDescription={renderDescription} />
            <InventorySection title={localize(localizationData, 'PF2E.Item.Consumable.Plural')} items={consumables} localizationData={localizationData} renderDescription={renderDescription} />
            
            {containers.map(container => (
                 <details key={container._id} open className="bg-foundry-dark p-3 rounded-md border border-foundry-light">
                    <summary className="font-bold text-lg text-foundry-accent cursor-pointer list-none flex justify-between items-center">
                        <span>{container.name}</span>
                    </summary>
                    <div className="mt-2">
                        {container.contents.length > 0 
                            ? <InventorySection title="" items={container.contents} localizationData={localizationData} renderDescription={renderDescription} /> 
                            : <p className="text-sm text-foundry-text-muted italic">Пусто</p>
                        }
                    </div>
                </details>
            ))}
            
            <InventorySection title={localize(localizationData, 'PF2E.NPC.AddTreasure')} items={treasure} localizationData={localizationData} renderDescription={renderDescription} />
        </div>
    );
};


const FoundryActorViewer: React.FC<FoundryActorViewerProps> = ({ data, onOpenActorByName, onOpenItemByName, onOpenJournalAndPage, localizationData, journals }) => {
    const [activeTab, setActiveTab] = useState('main');
    const [isSidebarVisible, setIsSidebarVisible] = useState(true);
    const system = data.system;
    const actorViewerRef = useRef<HTMLDivElement>(null);

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

        const contentElement = actorViewerRef.current;
        if (contentElement) {
            contentElement.addEventListener('click', handleContentClick);
        }

        return () => {
            if (contentElement) {
                contentElement.removeEventListener('click', handleContentClick);
            }
        };
    }, [onOpenActorByName, onOpenItemByName, onOpenJournalAndPage]);

    const { attacks, actions, spellcastingEntries, inventoryItems } = useMemo(() => {
        if (!data.items) return { attacks: [], actions: [], spellcastingEntries: [], inventoryItems: [] };
        
        const inventoryItemTypes = new Set(['weapon', 'shield', 'armor', 'equipment', 'consumable', 'backpack', 'treasure']);

        const attacks = data.items.filter((item: any) => item.type === 'melee' || item.type === 'ranged');
        const actions = data.items.filter((item: any) => item.type === 'action');
        const inventoryItems = data.items.filter((item: any) => inventoryItemTypes.has(item.type));
        
        const spellcastingEntries = data.items
            .filter((item: any) => item.type === 'spellcastingEntry')
            .map((entry: any) => {
                const spells = data.items.filter((spell: any) => spell.type === 'spell' && spell.system.location?.value === entry._id);
                
                const spellsByLevel: Record<string, any[]> = {};
                spells.forEach((spell: any) => {
                    let level;
                    if (spell.system.traits.value.includes('cantrip')) {
                        level = 'cantrip';
                    } else if (spell.system.location?.heightenedLevel) {
                        level = spell.system.location.heightenedLevel;
                    } else {
                        level = spell.system.level.value;
                    }
                    const levelKey = String(level);
                    if (!spellsByLevel[levelKey]) {
                        spellsByLevel[levelKey] = [];
                    }
                    spellsByLevel[levelKey].push(spell);
                });

                const sortedLevels = Object.keys(spellsByLevel).sort((a, b) => {
                    if (a === 'cantrip') return -1;
                    if (b === 'cantrip') return 1;
                    return Number(a) - Number(b);
                });
                
                const sortedSpellsByLevel: Record<string, any[]> = {};
                for (const level of sortedLevels) {
                    sortedSpellsByLevel[level] = spellsByLevel[level].sort((a: any, b: any) => a.name.localeCompare(b.name));
                }

                return {
                    ...entry,
                    spellsByLevel: sortedSpellsByLevel
                };
            });

        return { attacks, actions, spellcastingEntries, inventoryItems };
    }, [data.items]);

    const renderDescription = (desc: string) => {
        if (!desc) return null;
        const processed = processFoundryTags(desc, { journals }, localizationData);
        return <div className="text-sm text-foundry-text-muted journal-page-content" dangerouslySetInnerHTML={{ __html: processed }} />;
    };

    if (!system) {
        return <div className="p-4 text-center">Неверный формат данных актера.</div>;
    }

    // --- LOOT RENDER PATH ---
    if (data.type === 'loot') {
        return (
             <div ref={actorViewerRef} className="bg-foundry-mid text-foundry-text h-full flex flex-col font-sans overflow-hidden">
                <header className="bg-foundry-dark p-3 border-b border-foundry-light flex justify-between items-center flex-shrink-0">
                    <h2 className="text-2xl font-bold text-foundry-accent">{data.name}</h2>
                    <div className="text-right">
                        <span className="text-lg font-bold">{localize(localizationData, 'PF2E.ItemLevel', { type: localize(localizationData, 'PF2E.loot.LootLabel', {}), level: system.details.level.value })}</span>
                    </div>
                </header>
                <main className="flex-1 p-4 overflow-y-auto space-y-6">
                    {system.details.description && renderDescription(system.details.description)}
                    <InventoryTab items={inventoryItems} localizationData={localizationData} renderDescription={renderDescription} />
                </main>
             </div>
        );
    }
    
    // --- HAZARD RENDER PATH ---
    if (data.type === 'hazard') {
        const hazardActions = data.items?.filter((item: any) => item.type === 'action') ?? [];
        
        const InfoSection: React.FC<{ title: string; content: string; show?: boolean }> = ({ title, content, show = true }) => {
            if (!show || !content?.trim()) return null;
            return (
                <div>
                    <h3 className="text-lg font-bold border-b-2 border-foundry-accent mb-2">{title}</h3>
                    {renderDescription(content)}
                </div>
            );
        };
        
        return (
             <div ref={actorViewerRef} className="bg-foundry-mid text-foundry-text h-full flex flex-col font-sans overflow-hidden">
                <header className="bg-foundry-dark p-3 border-b border-foundry-light flex justify-between items-center flex-shrink-0">
                    <h2 className="text-2xl font-bold text-foundry-accent">{data.name}</h2>
                    <div className="text-right">
                        <span className="text-lg font-bold">{localize(localizationData, 'PF2E.Actor.Hazard.Level', { level: system.details.level.value })}</span>
                        <div className="flex gap-2 mt-1 flex-wrap justify-end">
                            {system.traits.rarity && <Trait slug={system.traits.rarity} localizationData={localizationData} />}
                            {system.traits.value.map((trait: string) => (
                                <Trait key={trait} slug={trait} localizationData={localizationData} />
                            ))}
                        </div>
                    </div>
                </header>
                <main className="flex-1 p-4 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 p-4 bg-foundry-dark rounded-md border border-foundry-light">
                        <StatBlock label={localize(localizationData, 'PF2E.StealthLabel', {})} value={system.attributes.stealth.value} details={system.attributes.stealth.details?.replace(/<p>|<\/p>/g, '')}/>
                        <StatBlock label={localize(localizationData, 'PF2E.ArmorClassShortLabel', {})} value={system.attributes.ac.value}/>
                        <StatBlock label={localize(localizationData, 'PF2E.HardnessLabel', {})} value={system.attributes.hardness}/>
                        <StatBlock label={localize(localizationData, 'PF2E.HitPointsShortLabel', {})} value={system.attributes.hp.max} details={system.attributes.hp.details}/>
                    </div>

                    <InfoSection title={localize(localizationData, 'PF2E.HazardDescriptionLabel', {})} content={system.details.description} />
                    
                    {hazardActions.length > 0 && (
                        <div>
                           <h3 className="text-lg font-bold border-b-2 border-foundry-accent mb-2">{localize(localizationData, 'PF2E.ActionsActionsHeader', {})}</h3>
                            <div className="space-y-3">
                                {hazardActions.map((item: any) => (
                                    <div key={item._id} className="bg-foundry-dark p-3 rounded">
                                        <p className="font-bold text-base flex justify-between items-center">
                                            <span>{item.name}</span>
                                            {getActionIcon(item.system.actionType?.value)}
                                        </p>
                                        {item.system.traits.value.length > 0 && (
                                            <div className="text-xs text-foundry-text-muted mt-1">
                                                <strong>{localize(localizationData, 'PF2E.TraitsLabel', {})}:</strong> {
                                                    item.system.traits.value.map((t: string) => localize(localizationData, `PF2E.Trait${slugToPascalCase(t)}`, {}) || t).join(', ')
                                                }
                                            </div>
                                        )}
                                        {renderDescription(item.system.description.value)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <InfoSection title={localize(localizationData, 'PF2E.HazardDisableLabel', {})} content={system.details.disable} />

                    <InfoSection title={localize(localizationData, 'PF2E.HazardRoutineLabel', {})} content={system.details.routine} show={system.details.isComplex}/>

                    <InfoSection title={localize(localizationData, 'PF2E.HazardResetLabel', {})} content={system.details.reset} />
                </main>
             </div>
        );
    }

    // --- NPC / CHARACTER RENDER PATH ---

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
        <div ref={actorViewerRef} className="bg-foundry-mid text-foundry-text h-full flex flex-col font-sans overflow-hidden relative">
            {/* Header */}
            <header className="bg-foundry-dark p-3 border-b border-foundry-light flex justify-between items-center">
                <h2 className="text-2xl font-bold text-foundry-accent">{data.name}</h2>
                <div className="text-right">
                    <span className="text-lg font-bold">{localize(localizationData, 'PF2E.Actor.NPC.LevelN', { level: system.details.level.value })}</span>
                    <div className="flex gap-2 mt-1 flex-wrap justify-end">
                        {system.traits.rarity && <Trait slug={system.traits.rarity} localizationData={localizationData} />}
                        {system.traits.size?.value && <Trait slug={system.traits.size.value} isSize localizationData={localizationData} />}
                        {system.traits.value.map((trait: string) => (
                             <Trait key={trait} slug={trait} localizationData={localizationData} />
                        ))}
                    </div>
                </div>
            </header>

            <button 
                onClick={() => setIsSidebarVisible(!isSidebarVisible)}
                className="absolute top-20 left-2 z-10 p-2 rounded-full text-white bg-black/30 hover:bg-black/50 transition-all opacity-50 hover:opacity-100"
                title={isSidebarVisible ? "Скрыть характеристики" : "Показать характеристики"}
            >
                 {isSidebarVisible ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                )}
            </button>

            <div className="flex flex-grow overflow-hidden">
                {/* Left Sidebar */}
                <aside className={`transition-all duration-300 overflow-hidden ${isSidebarVisible ? 'w-60 p-3' : 'w-0 p-0'} bg-foundry-dark flex-shrink-0`}>
                    <div className={`${isSidebarVisible ? 'block overflow-y-auto h-full space-y-3' : 'hidden'}`}>
                        <StatBlock label={localize(localizationData, 'PF2E.ArmorClassShortLabel')} value={system.attributes.ac.value} />
                        <StatBlock label={localize(localizationData, 'PF2E.HitPointsShortLabel')} value={system.attributes.hp.value} details={`max ${system.attributes.hp.max}`} />
                        <StatBlock label={localize(localizationData, 'PF2E.Actor.Speed.Label')} value={system.attributes.speed.value} details={system.attributes.speed.otherSpeeds?.map((s:any) => `${s.type} ${s.value}`).join(', ')} />
                        
                        <div className="border-t border-foundry-light pt-2">
                            <StatBlock label={localize(localizationData, 'PF2E.SavesFortitude')} value={system.saves.fortitude.value > 0 ? `+${system.saves.fortitude.value}` : system.saves.fortitude.value} />
                            <StatBlock label={localize(localizationData, 'PF2E.SavesReflex')} value={system.saves.reflex.value > 0 ? `+${system.saves.reflex.value}` : system.saves.reflex.value} />
                            <StatBlock label={localize(localizationData, 'PF2E.SavesWill')} value={system.saves.will.value > 0 ? `+${system.saves.will.value}` : system.saves.will.value} />
                        </div>

                        <div className="border-t border-foundry-light pt-2">
                             <h3 className="font-bold text-foundry-accent mb-1">{localize(localizationData, 'PF2E.PerceptionLabel')}</h3>
                             <SkillBlock label={localize(localizationData, 'PF2E.PerceptionLabel')} value={system.perception.mod} />
                             <p className="text-xs text-foundry-text-muted pl-2">
                                {system.perception.senses?.map((s: any) => s.type).join(', ')}
                             </p>
                        </div>

                        <div className="border-t border-foundry-light pt-2">
                             <h3 className="font-bold text-foundry-accent mb-1">{localize(localizationData, 'PF2E.SkillsLabel')}</h3>
                            {Object.entries(system.skills).map(([key, value]: [string, any]) => (
                                <SkillBlock key={key} label={localize(localizationData, `PF2E.Skill.${key.charAt(0).toUpperCase() + key.slice(1)}`)} value={value.base} />
                            ))}
                        </div>

                         <div className="border-t border-foundry-light pt-2 grid grid-cols-3 gap-2 text-center">
                             <h3 className="font-bold text-foundry-accent col-span-3 mb-1">{localize(localizationData, 'PF2E.Actor.Creature.AttributeModifiers')}</h3>
                             {Object.entries(system.abilities).map(([key, value]: [string, any]) => (
                                 <div key={key}>
                                     <div className="font-bold uppercase text-sm">{localize(localizationData, `PF2E.AbilityId.${key}`)}</div>
                                     <div className="text-lg">{value.mod > 0 ? `+${value.mod}` : value.mod}</div>
                                 </div>
                             ))}
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 flex flex-col overflow-hidden">
                    <nav className="flex-shrink-0 border-b border-foundry-light px-2">
                        <ActorTabButton tabId="main" label={localize(localizationData, 'PF2E.NPC.MainTab')} />
                        <ActorTabButton tabId="spells" label={localize(localizationData, 'PF2E.NPC.SpellsTab')} />
                        <ActorTabButton tabId="inventory" label={localize(localizationData, 'PF2E.NPC.InventoryTab')} />
                        <ActorTabButton tabId="notes" label={localize(localizationData, 'PF2E.NPC.NotesTab')} />
                    </nav>

                    <div className="flex-grow p-4 overflow-y-auto">
                        {activeTab === 'main' && (
                            <div className="space-y-4">
                                {attacks.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-bold border-b-2 border-foundry-accent mb-2">{localize(localizationData, 'PF2E.Actor.Attacks')}</h3>
                                        <div className="space-y-3">
                                            {attacks.map((item: any) => (
                                                <div key={item._id} className="bg-foundry-dark p-3 rounded">
                                                    <p className="font-bold text-base">{item.name}</p>
                                                    <div className="flex items-center gap-4 text-sm mt-1">
                                                        <span><strong>{localize(localizationData, 'PF2E.AttackLabel')}:</strong> <span className="text-foundry-accent">{item.system.bonus.value > 0 ? `+${item.system.bonus.value}`: item.system.bonus.value}</span></span>
                                                        <span><strong>{localize(localizationData, 'PF2E.DamageLabel')}:</strong> <span className="text-red-400">{Object.values(item.system.damageRolls).map((d: any) => `${d.damage} ${d.damageType}`).join(', ')}</span></span>
                                                    </div>
                                                    <div className="text-xs text-foundry-text-muted mt-1">
                                                        <strong>{localize(localizationData, 'PF2E.TraitsLabel')}:</strong> {
                                                            item.system.traits.value.map((t: string) => localize(localizationData, `PF2E.Trait${slugToPascalCase(t)}`) || t).join(', ')
                                                        }
                                                    </div>
                                                    {item.system.description.value && renderDescription(item.system.description.value)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {actions.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-bold border-b-2 border-foundry-accent mb-2">{localize(localizationData, 'PF2E.ActionsActionsHeader')}</h3>
                                        <div className="space-y-3">
                                            {actions.map((item: any) => (
                                                <div key={item._id} className="bg-foundry-dark p-3 rounded">
                                                    <p className="font-bold text-base">{item.name}</p>
                                                     <div className="text-xs text-foundry-text-muted mt-1">
                                                        <strong>{localize(localizationData, 'PF2E.TraitsLabel')}:</strong> {
                                                             item.system.traits.value.map((t: string) => localize(localizationData, `PF2E.Trait${slugToPascalCase(t)}`) || t).join(', ')
                                                        }
                                                    </div>
                                                    {renderDescription(item.system.description.value)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                         {activeTab === 'spells' && (
                            <div className="space-y-6">
                                {spellcastingEntries.length > 0 ? (
                                    spellcastingEntries.map((entry: any) => (
                                        <SpellcastingEntry key={entry._id} entry={entry} localizationData={localizationData} journals={journals} onOpenJournalAndPage={onOpenJournalAndPage} />
                                    ))
                                ) : (
                                    <div className="text-center text-foundry-text-muted pt-8">Заклинательные способности не найдены.</div>
                                )}
                            </div>
                        )}
                        {activeTab === 'inventory' && (
                             <InventoryTab items={inventoryItems} localizationData={localizationData} renderDescription={renderDescription} />
                        )}
                         {activeTab === 'notes' && (
                            <div className="space-y-4 journal-page-content">
                                {system.details.publicNotes && (
                                    <div>
                                        <h3 className="text-lg font-bold text-foundry-accent mb-2">{localize(localizationData, 'PF2E.NPC.PublicNotes')}</h3>
                                        <div dangerouslySetInnerHTML={{__html: processFoundryTags(system.details.publicNotes, { journals }, localizationData)}} />
                                    </div>
                                )}
                                {system.details.privateNotes && (
                                    <div>
                                        <h3 className="text-lg font-bold text-foundry-accent mb-2">{localize(localizationData, 'PF2E.NPC.PrivateNotes')}</h3>
                                        <div dangerouslySetInnerHTML={{__html: processFoundryTags(system.details.privateNotes, { journals }, localizationData)}} />
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