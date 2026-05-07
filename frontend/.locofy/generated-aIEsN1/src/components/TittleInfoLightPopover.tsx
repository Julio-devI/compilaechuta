import { FunctionComponent, type CSSProperties } from "react";
import { Box } from "@mui/material";
import IconePopover from "./IconePopover";
import styles from "./TittleInfoLightPopover.module.css";

export type TittleInfoLightPopoverType = {
  className?: string;
  iconLeft?: boolean;
  iconRight?: boolean;
  popoverTitle?: string;
  infoExplainingMore?: string;
  iconePopoverProperty1?: CSSProperties["property1"];
  iconePopoverProperty11?: CSSProperties["property1"];
  iconePopoverLatePackage?: string;
  iconePopoverIconBackground?: CSSProperties["backgroundColor"];
  iconePopoverIconBackground1?: CSSProperties["backgroundColor"];
  iconePopoverIconBackground3?: CSSProperties["background"];

  /** Variant props */
  property1?: CSSProperties["property1"];
};

const TittleInfoLightPopover: FunctionComponent<TittleInfoLightPopoverType> = ({
  className = "",
  property1 = "Default",
  iconLeft = true,
  iconRight = true,
  popoverTitle,
  infoExplainingMore,
  iconePopoverProperty1,
  iconePopoverProperty11,
  iconePopoverLatePackage,
  iconePopoverIconBackground,
  iconePopoverIconBackground1,
  iconePopoverIconBackground3,
}) => {
  return (
    <Box
      className={[styles.shortcutItemWrapper, className].join(" ")}
      data-property1={property1}
    >
      <Box className={styles.shortcutItem}>
        {!!iconLeft && (
          <IconePopover
            property1={iconePopoverProperty1}
            iconBackgroundBackgroundColor={iconePopoverIconBackground}
            latePackage={iconePopoverLatePackage}
          />
        )}
        <Box className={styles.popoverTitleParent}>
          <div className={styles.popoverTitle}>{popoverTitle}</div>
          <div className={styles.infoExplainingMore}>{infoExplainingMore}</div>
        </Box>
        {!!iconRight && (
          <IconePopover
            property1={iconePopoverProperty11}
            iconBackgroundBackgroundColor={iconePopoverIconBackground1}
            iconBackgroundBackground={iconePopoverIconBackground3}
            latePackage="/Arrow-right.svg"
          />
        )}
      </Box>
    </Box>
  );
};

export default TittleInfoLightPopover;
