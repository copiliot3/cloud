import { getFileType } from '../../utils/fileTypes';
import AnimatedFolderIcon from './AnimatedFolderIcon';

export default function FileIcon({ item, size = 'md', animate = true }) {
  const fileType = getFileType(item);
  const sizes = {
    sm: { icon: 'text-[18px]', wrapper: 'w-6 h-6', svg: 'w-5 h-5' },
    md: { icon: 'text-[22px]', wrapper: 'w-7 h-7', svg: 'w-6 h-6' },
    lg: { icon: 'text-[32px]', wrapper: 'w-10 h-10', svg: 'w-9 h-9' },
    xl: { icon: 'text-[48px]', wrapper: 'w-16 h-16', svg: 'w-16 h-16' },
    xxl: { icon: 'text-[64px]', wrapper: 'w-24 h-24', svg: 'w-24 h-24' },
  };

  const s = sizes[size] || sizes.md;

  if (item.isDirectory) {
    return (
      <div className={`${s.wrapper} flex items-center justify-center shrink-0 pointer-events-none`}>
        <AnimatedFolderIcon 
          isEmpty={item.isEmpty} 
          previews={item.previews || []} 
          className={s.svg} 
          animate={animate}
          path={item.path}
        />
      </div>
    );
  }

  return (
    <div className={`${s.wrapper} flex items-center justify-center shrink-0 pointer-events-none`}>
      <span
        className={`material-symbols-outlined ${s.icon}`}
        style={{ color: fileType.color }}
      >
        {fileType.icon}
      </span>
    </div>
  );
}
