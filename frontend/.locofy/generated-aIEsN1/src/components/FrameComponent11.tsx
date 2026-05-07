import { FunctionComponent, type CSSProperties } from "react";
import { Box } from "@mui/material";
import FrameComponent from "./FrameComponent";
import AvatarLargeIconDefault from "./AvatarLargeIconDefault";
import styles from "./FrameComponent11.module.css";

export type FrameComponent11Type = {
  className?: string;
  size?: CSSProperties["size"];
  status1?: CSSProperties["status"];
  type?: CSSProperties["type"];
};

const FrameComponent11: FunctionComponent<FrameComponent11Type> = ({
  className = "",
  size,
  status1,
  type,
}) => {
  return (
    <Box className={[styles.component7Inner, className].join(" ")}>
      <Box className={styles.frameParent}>
        <Box className={styles.frameGroup}>
          <Box className={styles.unionWrapper}>
            <img className={styles.unionIcon} alt="" src="/Union.svg" />
          </Box>
          <FrameComponent property1="Default" />
        </Box>
        <Box className={styles.frameContainer}>
          <Box className={styles.searchParent}>
            <img className={styles.searchIcon} alt="" src="/Search.svg" />
            <img
              className={styles.arrowUpCircleIcon}
              alt=""
              src="/Arrow-up-circle.svg"
            />
            <div className={styles.pesquiseNaPlataforma}>
              Pesquise na plataforma...
            </div>
          </Box>
          <Box className={styles.frameContainer}>
            <Box className={styles.notfificationWrapper}>
              <img
                className={styles.notfificationIcon}
                alt=""
                src="/Notfification.svg"
              />
            </Box>
            <Box className={styles.avatarWrapper}>
              <AvatarLargeIconDefault
                size={size}
                status1={status1}
                type={type}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default FrameComponent11;
