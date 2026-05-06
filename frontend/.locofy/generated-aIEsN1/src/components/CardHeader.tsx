import { FunctionComponent, useMemo, type CSSProperties } from "react";
import { Box } from "@mui/material";
import styles from "./CardHeader.module.css";

export type CardHeaderType = {
  className?: string;
  title?: string;
  subtitle?: string;
  description?: string;

  /** Style props */
  subtitleAlignSelf?: CSSProperties["alignSelf"];
  subtitleWidth?: CSSProperties["width"];
  subtitleDisplay?: CSSProperties["display"];
  subtitleAlignItems?: CSSProperties["alignItems"];
};

const CardHeader: FunctionComponent<CardHeaderType> = ({
  className = "",
  title,
  subtitle,
  subtitleAlignSelf,
  subtitleWidth,
  subtitleDisplay,
  subtitleAlignItems,
  description,
}) => {
  const subtitleStyle: CSSProperties = useMemo(() => {
    return {
      alignSelf: subtitleAlignSelf,
      width: subtitleWidth,
      display: subtitleDisplay,
      alignItems: subtitleAlignItems,
    };
  }, [subtitleAlignSelf, subtitleWidth, subtitleDisplay, subtitleAlignItems]);

  return (
    <Box className={[styles.cardHeader, className].join(" ")}>
      <Box className={styles.cardHeader2}>
        <Box className={styles.iconAndTitleContainer}>
          <Box className={styles.trendIconContainer}>
            <img className={styles.trendIcon} alt="" src="/Trend-icon.svg" />
          </Box>
          <div className={styles.title}>{title}</div>
        </Box>
        <Box className={styles.h3fontDisplay}>
          <div className={styles.subtitle} style={subtitleStyle}>
            {subtitle}
          </div>
        </Box>
        <Box className={styles.ptextSm}>
          <div className={styles.description}>{description}</div>
        </Box>
      </Box>
    </Box>
  );
};

export default CardHeader;
