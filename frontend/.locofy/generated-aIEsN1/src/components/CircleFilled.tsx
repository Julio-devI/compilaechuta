import { FunctionComponent, type CSSProperties } from "react";
import { Box } from "@mui/material";
import styles from "./CircleFilled.module.css";

export type CircleFilledType = {
  className?: string;
  circleFilled?: string;
  dentroDoPrazo?: string;

  /** Variant props */
  property1?: CSSProperties["property1"];
};

const CircleFilled: FunctionComponent<CircleFilledType> = ({
  className = "",
  property1 = "tempo aberto",
  circleFilled,
  dentroDoPrazo,
}) => {
  return (
    <Box
      className={[styles.root, className].join(" ")}
      data-property1={property1}
    >
      <img className={styles.circleFilledIcon} alt="" src={circleFilled} />
      <div className={styles.dentroDoPrazo}>{dentroDoPrazo}</div>
    </Box>
  );
};

export default CircleFilled;
