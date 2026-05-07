import { FunctionComponent, type CSSProperties } from "react";
import { Typography, Box } from "@mui/material";
import styles from "./LightChipIconFilled.module.css";

export type LightChipIconFilledType = {
  className?: string;

  /** Variant props */
  property1?: CSSProperties["property1"];
};

const LightChipIconFilled: FunctionComponent<LightChipIconFilledType> = ({
  className = "",
  property1 = "Default",
}) => {
  return (
    <Box
      className={[styles.lightChipIconFilled, className].join(" ")}
      data-property1={property1}
    >
      <Box className={styles.alertTriangleParent}>
        <img
          className={styles.alertTriangleIcon}
          alt=""
          src="/Alert-triangle.svg"
        />
        <Box className={styles.chipContent}>
          <Typography
            className={styles.chipTitle}
            variant="inherit"
            variantMapping={{ inherit: "b" }}
            sx={{ fontWeight: "700" }}
          >
            655 Atrasados
          </Typography>
        </Box>
        <img
          className={styles.featherIconsShoppingBag}
          alt=""
          src="/Feather-Icons-shopping-bag.svg"
        />
      </Box>
    </Box>
  );
};

export default LightChipIconFilled;
