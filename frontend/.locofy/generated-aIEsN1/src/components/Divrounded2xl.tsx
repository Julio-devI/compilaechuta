import { FunctionComponent, useMemo, type CSSProperties } from "react";
import { Box } from "@mui/material";
import styles from "./Divrounded2xl.module.css";

export type Divrounded2xlType = {
  className?: string;
  detratores?: string;
  trendValue?: string;

  /** Style props */
  divrounded2xlGridColumn?: CSSProperties["gridColumn"];
  spanh2BackgroundColor?: CSSProperties["backgroundColor"];
  trendValueWidth?: CSSProperties["width"];
  trendValueDisplay?: CSSProperties["display"];
  trendValueAlignItems?: CSSProperties["alignItems"];
};

const Divrounded2xl: FunctionComponent<Divrounded2xlType> = ({
  className = "",
  divrounded2xlGridColumn,
  spanh2BackgroundColor,
  detratores,
  trendValue,
  trendValueWidth,
  trendValueDisplay,
  trendValueAlignItems,
}) => {
  const divrounded2xlStyle: CSSProperties = useMemo(() => {
    return {
      gridColumn: divrounded2xlGridColumn,
    };
  }, [divrounded2xlGridColumn]);

  const spanh2Style: CSSProperties = useMemo(() => {
    return {
      backgroundColor: spanh2BackgroundColor,
    };
  }, [spanh2BackgroundColor]);

  const trendValueStyle: CSSProperties = useMemo(() => {
    return {
      width: trendValueWidth,
      display: trendValueDisplay,
      alignItems: trendValueAlignItems,
    };
  }, [trendValueWidth, trendValueDisplay, trendValueAlignItems]);

  return (
    <Box
      className={[styles.divrounded2xl, className].join(" ")}
      style={divrounded2xlStyle}
    >
      <Box className={styles.divflex}>
        <Box className={styles.spanh2} style={spanh2Style} />
        <Box className={styles.ptextXs}>
          <div className={styles.detratores}>{detratores}</div>
        </Box>
      </Box>
      <Box className={styles.pfontDisplay}>
        <div className={styles.trendValue} style={trendValueStyle}>
          {trendValue}
        </div>
      </Box>
    </Box>
  );
};

export default Divrounded2xl;
