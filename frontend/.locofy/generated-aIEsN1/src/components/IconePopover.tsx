import { FunctionComponent, useMemo, type CSSProperties } from "react";
import { Box } from "@mui/material";
import styles from "./IconePopover.module.css";

export type IconePopoverType = {
  className?: string;
  latePackage?: string;

  /** Variant props */
  property1?: CSSProperties["property1"];

  /** Style props */
  iconBackgroundBackgroundColor?: CSSProperties["backgroundColor"];
  iconBackgroundBackground?: CSSProperties["background"];
};

const IconePopover: FunctionComponent<IconePopoverType> = ({
  className = "",
  property1 = "type 1",
  iconBackgroundBackgroundColor,
  iconBackgroundBackground,
  latePackage,
}) => {
  const iconBackgroundStyle: CSSProperties = useMemo(() => {
    return {
      backgroundColor: iconBackgroundBackgroundColor,
      background: iconBackgroundBackground,
    };
  }, [iconBackgroundBackgroundColor, iconBackgroundBackground]);

  return (
    <Box
      className={[styles.iconePopover, className].join(" ")}
      data-property1={property1}
    >
      <Box className={styles.iconBackground} style={iconBackgroundStyle} />
      <img className={styles.latePackageIcon} alt="" src={latePackage} />
    </Box>
  );
};

export default IconePopover;
