import { Coins, Settings2, Zap } from 'lucide-react';
import { Brand } from './Brand';
export function Header({ onSettings }: { onSettings: () => void }) {
  return <header className="site-header"><div className="header-inner">
    <a href="#upgrade" className="logo-link" aria-label="VLADGELIK — к улучшению"><Brand /></a>
    <div className="header-divider" />
    <a className="header-tab" href="#upgrade"><Zap size={17} fill="currentColor" /> УЛУЧШЕНИЕ</a>
    <div className="header-right"><div className="online"><span className="online-dot" /><b>1 284</b><span>онлайн<small>демо</small></span></div><div className="balance"><span className="coin-icon"><Coins size={19} /></span><div><small>ВАШ БАЛАНС</small><b>0 <span>монет</span></b></div></div><button className="icon-button" onClick={onSettings} aria-label="НАСТРОЙКИ" title="Настройки"><Settings2 size={20} /></button></div>
  </div></header>;
}
