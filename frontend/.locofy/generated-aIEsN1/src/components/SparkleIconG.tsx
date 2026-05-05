import { FunctionComponent, type CSSProperties } from "react";
import { Box } from "@mui/material";
import styles from "./SparkleIconG.module.css";

export type SparkleIconGType = {
  className?: string;
  showSparkleIconG?: boolean;
  component1?: string;

  /** Variant props */
  color?: CSSProperties["color"];
  state?: CSSProperties["state"];
  type?: CSSProperties["type"];
};

const SparkleIconG: FunctionComponent<SparkleIconGType> = ({
  className = "",
  color = "Blue",
  state = "Default",
  type = "Primary",
  showSparkleIconG,
  component1,
}) => {
  return (
    <Box
      className={[styles.sparkleIconG, className].join(" ")}
      data-color={color}
      data-state={state}
      data-type={type}
    >
      <img className={styles.component1Icon} alt="" src={component1} />
    </Box>
  );
};

export default SparkleIconG;
