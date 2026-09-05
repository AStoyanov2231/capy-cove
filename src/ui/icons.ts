import { createIcons, ArrowRight, Check, CheckCheck, ChevronRight, CircleHelp, Copy, DoorOpen, Flower2, Heart, Leaf, Link, LoaderCircle, Map, Minus, MousePointer2, Package, Plus, Radio, RotateCcw, RotateCw, Moon, Settings2, Sprout, Sun, Users, Volume2, VolumeX, Waves, X } from 'lucide';
export function icon(name: string, className = ''): string { return `<i data-lucide="${name}" class="${className}" aria-hidden="true"></i>`; }
export function renderIcons(): void {
  createIcons({ icons: { ArrowRight, Check, CheckCheck, ChevronRight, CircleHelp, Copy, DoorOpen, Flower2, Heart, Leaf, Link, LoaderCircle, Map, Minus, MousePointer2, Package, Plus, Radio, RotateCcw, RotateCw, Moon, Settings2, Sprout, Sun, Users, Volume2, VolumeX, Waves, X }, attrs: { 'stroke-width': 1.8 } });
}
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
