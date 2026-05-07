import { FunctionComponent, type CSSProperties } from "react";
import { Box } from "@mui/material";
import styles from "./AvatarLargeIconDefault.module.css";

export type AvatarLargeIconDefaultType = {
  className?: string;

  /** Variant props */
  size?: CSSProperties["size"];
  status1?: CSSProperties["status"];
  type?: CSSProperties["type"];
};

const AvatarLargeIconDefault: FunctionComponent<AvatarLargeIconDefaultType> = ({
  className = "",
  size = "Tiny",
  status1 = "Default",
  type = "Initials",
}) => {
  return (
    <Box
      className={[styles.avatar, className].join(" ")}
      data-size={size}
      data-status={status1}
      data-type={type}
    >
      <img
        className={styles.avatarLargeicondefault}
        alt=""
        src="/Avatar-Large-Icon-Default.svg"
      />
      <div className={styles.aa}>AA</div>
      <Box className={styles.avatarChild} />
    </Box>
  );
};

export default AvatarLargeIconDefault;
