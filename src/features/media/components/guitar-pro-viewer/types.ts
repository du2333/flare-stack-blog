export interface GuitarProViewerProps {
  /** 是否显示查看器 */
  isOpen: boolean;
  /** Guitar Pro 文件的 URL */
  fileUrl: string;
  /** 文件名 */
  fileName: string;
  /** 关闭回调 */
  onClose: () => void;
}
