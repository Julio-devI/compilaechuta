import { FunctionComponent, type CSSProperties } from "react";
import { Box } from "@mui/material";
import CardHeader from "./CardHeader";
import styles from "./TendnciasCards.module.css";

export type TendnciasCardsType = {
  className?: string;

  /** Variant props */
  property1?: CSSProperties["property1"];
};

const TendnciasCards: FunctionComponent<TendnciasCardsType> = ({
  className = "",
  property1 = "Default",
}) => {
  return (
    <Box
      className={[styles.tendnciasCards, className].join(" ")}
      data-property1={property1}
    >
      <Box className={styles.card}>
        <CardHeader
          title="TENDÊNCIAS"
          subtitle="Média de Receita por Mês"
          description="Evolução de faturamento — clique para detalhar"
        />
        <Box className={styles.div}>
          <Box className={styles.component1}>
            <img className={styles.groupIcon} alt="" src="/Group.svg" />
            <Box className={styles.group}>
              <Box className={styles.group2}>
                <Box className={styles.group3}>
                  <div className={styles.xAxisLabel}>Jan</div>
                </Box>
                <Box className={styles.group4}>
                  <div className={styles.xAxisLabel2}>Fev</div>
                </Box>
                <Box className={styles.group5}>
                  <div className={styles.xAxisLabel3}>Mar</div>
                </Box>
                <Box className={styles.group6}>
                  <div className={styles.xAxisLabel4}>Abr</div>
                </Box>
                <Box className={styles.group7}>
                  <div className={styles.xAxisLabel5}>Mai</div>
                </Box>
                <Box className={styles.group8}>
                  <div className={styles.xAxisLabel6}>Jun</div>
                </Box>
                <Box className={styles.group9}>
                  <div className={styles.xAxisLabel7}>Jul</div>
                </Box>
                <Box className={styles.group10}>
                  <div className={styles.xAxisLabel8}>Ago</div>
                </Box>
                <Box className={styles.group11}>
                  <div className={styles.xAxisLabel9}>Set</div>
                </Box>
                <Box className={styles.group12}>
                  <div className={styles.xAxisLabel10}>Out</div>
                </Box>
                <Box className={styles.group13}>
                  <div className={styles.xAxisLabel11}>Nov</div>
                </Box>
                <Box className={styles.group14}>
                  <div className={styles.xAxisLabel12}>Dez</div>
                </Box>
              </Box>
            </Box>
            <Box className={styles.group15}>
              <Box className={styles.group16}>
                <Box className={styles.group17}>
                  <div className={styles.yAxisLabel}>0k</div>
                </Box>
                <Box className={styles.group18}>
                  <div className={styles.yAxisLabel2}>200k</div>
                </Box>
                <Box className={styles.group19}>
                  <div className={styles.yAxisLabel3}>400k</div>
                </Box>
                <Box className={styles.group20}>
                  <div className={styles.yAxisLabel4}>720k</div>
                </Box>
              </Box>
            </Box>
            <img className={styles.groupIcon2} alt="" src="/Group.svg" />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default TendnciasCards;
